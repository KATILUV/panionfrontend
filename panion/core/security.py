"""
Security System
Provides comprehensive security features including authentication, authorization, input validation, and audit logging.
"""

import os
import sys
import logging
import threading
import time
import hashlib
import hmac
import jwt
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Optional, Any, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor
import ipaddress
import secrets
import bcrypt

from .error_handling import error_handler, with_error_recovery

@dataclass
class SecurityConfig:
    """Security configuration."""
    # Authentication settings
    jwt_secret: str = field(default_factory=lambda: secrets.token_hex(32))
    jwt_algorithm: str = "HS256"
    jwt_expiry: int = 3600  # seconds
    password_hash_rounds: int = 12
    
    # Authorization settings
    default_role: str = "user"
    admin_role: str = "admin"
    role_hierarchy: Dict[str, List[str]] = field(default_factory=dict)
    
    # Input validation
    max_input_length: int = 1024
    allowed_file_types: List[str] = field(default_factory=lambda: ["txt", "json", "yaml"])
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # Rate limiting
    max_requests_per_minute: int = 60
    max_failed_attempts: int = 5
    lockout_duration: int = 300  # seconds
    
    # Network security
    allowed_ips: List[str] = field(default_factory=list)
    blocked_ips: List[str] = field(default_factory=list)
    require_https: bool = True
    
    # Audit logging
    audit_log_file: str = "logs/audit.log"
    log_sensitive_data: bool = False
    retention_days: int = 90

@dataclass
class User:
    """User information."""
    id: str
    username: str
    email: str
    roles: List[str]
    is_active: bool = True
    last_login: Optional[datetime] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None

class SecurityManager:
    """Security manager."""
    
    def __init__(self, config: Optional[SecurityConfig] = None):
        """Initialize security manager.
        
        Args:
            config: Security configuration
        """
        self.logger = logging.getLogger("SecurityManager")
        self._setup_logging()
        
        self.config = config or SecurityConfig()
        self._setup_audit_logging()
        
        # State tracking
        self._users: Dict[str, User] = {}
        self._tokens: Dict[str, Dict[str, Any]] = {}
        self._rate_limits: Dict[str, List[datetime]] = {}
        self._ip_blocks: Dict[str, datetime] = {}
        
        # Thread safety
        self._lock = threading.Lock()
    
    def _setup_logging(self) -> None:
        """Setup security logging."""
        log_file = Path("logs") / "security.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _setup_audit_logging(self) -> None:
        """Setup audit logging."""
        log_file = Path(self.config.audit_log_file)
        log_file.parent.mkdir(exist_ok=True)
        
        self.audit_logger = logging.getLogger("AuditLogger")
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(levelname)s - %(user)s - %(action)s - %(details)s'
        ))
        self.audit_logger.addHandler(handler)
    
    def register_user(self, username: str, email: str, password: str, roles: Optional[List[str]] = None) -> User:
        """Register a new user.
        
        Args:
            username: Username
            email: Email address
            password: Password
            roles: User roles
            
        Returns:
            User: Registered user
            
        Raises:
            ValueError: If username or email already exists
        """
        with self._lock:
            # Check if username exists
            if username in self._users:
                raise ValueError("Username already exists")
            
            # Check if email exists
            if any(user.email == email for user in self._users.values()):
                raise ValueError("Email already exists")
            
            # Hash password
            password_hash = bcrypt.hashpw(
                password.encode(),
                bcrypt.gensalt(self.config.password_hash_rounds)
            )
            
            # Create user
            user = User(
                id=secrets.token_hex(16),
                username=username,
                email=email,
                roles=roles or [self.config.default_role]
            )
            
            # Store user
            self._users[username] = user
            
            # Log registration
            self._audit_log(
                "register",
                username,
                {"email": email, "roles": roles}
            )
            
            return user
    
    def authenticate(self, username: str, password: str, ip_address: str) -> Optional[str]:
        """Authenticate a user.
        
        Args:
            username: Username
            password: Password
            ip_address: IP address
            
        Returns:
            Optional[str]: JWT token if authentication successful
            
        Raises:
            ValueError: If user is locked out
        """
        with self._lock:
            # Check IP block
            if ip_address in self._ip_blocks:
                block_time = self._ip_blocks[ip_address]
                if datetime.now() < block_time:
                    raise ValueError("IP address is blocked")
                del self._ip_blocks[ip_address]
            
            # Get user
            user = self._users.get(username)
            if not user:
                self._handle_failed_attempt(ip_address)
                return None
            
            # Check if user is locked
            if user.locked_until and datetime.now() < user.locked_until:
                raise ValueError("Account is locked")
            
            # Verify password
            if not bcrypt.checkpw(password.encode(), user.password_hash):
                user.failed_attempts += 1
                if user.failed_attempts >= self.config.max_failed_attempts:
                    user.locked_until = datetime.now() + timedelta(seconds=self.config.lockout_duration)
                self._handle_failed_attempt(ip_address)
                return None
            
            # Reset failed attempts
            user.failed_attempts = 0
            user.locked_until = None
            user.last_login = datetime.now()
            
            # Generate token
            token = self._generate_token(user)
            
            # Log authentication
            self._audit_log(
                "authenticate",
                username,
                {"ip_address": ip_address}
            )
            
            return token
    
    def verify_token(self, token: str) -> Optional[User]:
        """Verify JWT token.
        
        Args:
            token: JWT token
            
        Returns:
            Optional[User]: User if token is valid
        """
        try:
            # Decode token
            payload = jwt.decode(
                token,
                self.config.jwt_secret,
                algorithms=[self.config.jwt_algorithm]
            )
            
            # Check expiration
            if datetime.fromtimestamp(payload['exp']) < datetime.now():
                return None
            
            # Get user
            username = payload['sub']
            user = self._users.get(username)
            
            if not user or not user.is_active:
                return None
            
            return user
            
        except Exception as e:
            self.logger.error(f"Token verification failed: {str(e)}")
            return None
    
    def authorize(self, user: User, required_roles: List[str]) -> bool:
        """Authorize user access.
        
        Args:
            user: User to authorize
            required_roles: Required roles
            
        Returns:
            bool: True if authorized
        """
        # Check if user has any required role
        for role in required_roles:
            if role in user.roles:
                return True
            
            # Check role hierarchy
            if role in self.config.role_hierarchy:
                for sub_role in self.config.role_hierarchy[role]:
                    if sub_role in user.roles:
                        return True
        
        return False
    
    def validate_input(self, data: Any, schema: Dict[str, Any]) -> bool:
        """Validate input data.
        
        Args:
            data: Data to validate
            schema: Validation schema
            
        Returns:
            bool: True if valid
        """
        try:
            # Check data type
            if not isinstance(data, dict):
                return False
            
            # Validate each field
            for field, rules in schema.items():
                if field not in data:
                    if rules.get('required', False):
                        return False
                    continue
                
                value = data[field]
                
                # Check type
                if 'type' in rules and not isinstance(value, rules['type']):
                    return False
                
                # Check length
                if 'min_length' in rules and len(str(value)) < rules['min_length']:
                    return False
                if 'max_length' in rules and len(str(value)) > rules['max_length']:
                    return False
                
                # Check pattern
                if 'pattern' in rules and not re.match(rules['pattern'], str(value)):
                    return False
                
                # Check range
                if 'min' in rules and value < rules['min']:
                    return False
                if 'max' in rules and value > rules['max']:
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Input validation failed: {str(e)}")
            return False
    
    def validate_file(self, file_path: str) -> bool:
        """Validate file.
        
        Args:
            file_path: Path to file
            
        Returns:
            bool: True if valid
        """
        try:
            # Check file exists
            if not os.path.exists(file_path):
                return False
            
            # Check file size
            if os.path.getsize(file_path) > self.config.max_file_size:
                return False
            
            # Check file type
            ext = os.path.splitext(file_path)[1].lower().lstrip('.')
            if ext not in self.config.allowed_file_types:
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"File validation failed: {str(e)}")
            return False
    
    def check_rate_limit(self, ip_address: str) -> bool:
        """Check rate limit for IP address.
        
        Args:
            ip_address: IP address
            
        Returns:
            bool: True if within limit
        """
        with self._lock:
            # Get request times
            times = self._rate_limits.get(ip_address, [])
            now = datetime.now()
            
            # Remove old requests
            times = [t for t in times if now - t < timedelta(minutes=1)]
            
            # Check limit
            if len(times) >= self.config.max_requests_per_minute:
                return False
            
            # Add new request
            times.append(now)
            self._rate_limits[ip_address] = times
            
            return True
    
    def check_ip_access(self, ip_address: str) -> bool:
        """Check IP address access.
        
        Args:
            ip_address: IP address
            
        Returns:
            bool: True if allowed
        """
        try:
            # Parse IP
            ip = ipaddress.ip_address(ip_address)
            
            # Check blocked IPs
            for blocked in self.config.blocked_ips:
                if ip in ipaddress.ip_network(blocked):
                    return False
            
            # Check allowed IPs
            if self.config.allowed_ips:
                for allowed in self.config.allowed_ips:
                    if ip in ipaddress.ip_network(allowed):
                        return True
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"IP access check failed: {str(e)}")
            return False
    
    def _generate_token(self, user: User) -> str:
        """Generate JWT token.
        
        Args:
            user: User to generate token for
            
        Returns:
            str: JWT token
        """
        # Create payload
        payload = {
            'sub': user.username,
            'roles': user.roles,
            'iat': datetime.now(),
            'exp': datetime.now() + timedelta(seconds=self.config.jwt_expiry)
        }
        
        # Generate token
        return jwt.encode(
            payload,
            self.config.jwt_secret,
            algorithm=self.config.jwt_algorithm
        )
    
    def _handle_failed_attempt(self, ip_address: str) -> None:
        """Handle failed authentication attempt.
        
        Args:
            ip_address: IP address
        """
        with self._lock:
            # Increment failed attempts
            if ip_address not in self._ip_blocks:
                self._ip_blocks[ip_address] = datetime.now()
            
            # Check if should block
            if len(self._ip_blocks) >= self.config.max_failed_attempts:
                self._ip_blocks[ip_address] = datetime.now() + timedelta(seconds=self.config.lockout_duration)
    
    def _audit_log(self, action: str, username: str, details: Dict[str, Any]) -> None:
        """Log audit event.
        
        Args:
            action: Action performed
            username: Username
            details: Event details
        """
        # Filter sensitive data
        if not self.config.log_sensitive_data:
            details = {k: v for k, v in details.items() if k not in ['password', 'token']}
        
        # Log event
        self.audit_logger.info(
            f"{action}",
            extra={
                'user': username,
                'action': action,
                'details': json.dumps(details)
            }
        )
    
    def cleanup(self) -> None:
        """Clean up old data."""
        with self._lock:
            now = datetime.now()
            
            # Clean up rate limits
            for ip, times in list(self._rate_limits.items()):
                times = [t for t in times if now - t < timedelta(minutes=1)]
                if not times:
                    del self._rate_limits[ip]
                else:
                    self._rate_limits[ip] = times
            
            # Clean up IP blocks
            for ip, block_time in list(self._ip_blocks.items()):
                if now >= block_time:
                    del self._ip_blocks[ip]
            
            # Clean up audit logs
            if os.path.exists(self.config.audit_log_file):
                cutoff = now - timedelta(days=self.config.retention_days)
                with open(self.config.audit_log_file, 'r') as f:
                    lines = f.readlines()
                with open(self.config.audit_log_file, 'w') as f:
                    for line in lines:
                        try:
                            timestamp = datetime.strptime(
                                line.split(' - ')[0],
                                '%Y-%m-%d %H:%M:%S,%f'
                            )
                            if timestamp >= cutoff:
                                f.write(line)
                        except Exception:
                            f.write(line)

# Create global security manager
security_manager = SecurityManager() 