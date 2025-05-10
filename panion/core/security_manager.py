"""
Security Manager
Handles authentication, authorization, and security monitoring.
"""

import os
import json
import yaml
import logging
import time
import hmac
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple, Set
from pathlib import Path
import jwt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import pyotp
import qrcode
from flask import request, g
import redis
from dataclasses import dataclass, field
import asyncio
from functools import wraps

from core.reflection import reflection_system
from core.service_locator import service_locator
import bcrypt

@dataclass
class SecurityConfig:
    """Configuration settings for the security manager.
    
    Attributes:
        jwt_secret: Secret key used for JWT token signing
        jwt_expiry: Time in seconds before JWT tokens expire
        api_key_rotation_days: Number of days before API keys must be rotated
        encryption_key: Key used for data encryption
        allowed_origins: List of allowed CORS origins
        ssl_enabled: Whether SSL/TLS is enabled
        two_factor_enabled: Whether 2FA is enabled
        request_signing_enabled: Whether request signing is required
        ip_whitelist: List of allowed IP addresses
        ip_blacklist: List of blocked IP addresses
    """
    jwt_secret: str
    jwt_expiry: int = 3600  # seconds
    api_key_rotation_days: int = 30
    encryption_key: str
    allowed_origins: List[str] = field(default_factory=list)
    ssl_enabled: bool = True
    two_factor_enabled: bool = True
    request_signing_enabled: bool = True
    ip_whitelist: List[str] = field(default_factory=list)
    ip_blacklist: List[str] = field(default_factory=list)

class SecurityManager:
    """Manages system security, authentication, and authorization."""
    
    def __init__(self, config_path: str = "config/security.yaml"):
        """Initialize the security manager."""
        self.logger = logging.getLogger(__name__)
        self.config_path = Path(config_path)
        self.config = self._load_config()
        
        # Security state
        self._is_initialized = False
        self._is_monitoring = False
        self._api_keys = {}
        self._user_tokens = {}
        self._violation_log = []
        
        # Security settings
        self._jwt_secret = self.config.get('jwt_secret', 'your-secret-key')
        self._token_expiry = timedelta(hours=24)
        self._max_violations = 5
        self._violation_window = timedelta(hours=1)
        
        # Register with service locator
        service_locator.register_service('security_manager', self)
        
        # Initialize Redis
        self.redis = redis.Redis(
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", 6379)),
            db=0
        )
        
        # Initialize encryption
        self._setup_encryption()
    
    def _setup_logging(self) -> None:
        """Setup logging for Security Manager."""
        log_file = Path("logs") / "security_manager.log"
        log_file.parent.mkdir(exist_ok=True)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load security configuration."""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"Config file not found: {self.config_path}")
            
            with open(self.config_path) as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading security config: {e}")
            return {}
    
    def _setup_encryption(self) -> None:
        """Setup encryption components."""
        try:
            # Generate encryption key from password
            password = os.getenv("SECURITY_ENCRYPTION_PASSWORD", "default-password").encode()
            salt = os.urandom(16)
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
                backend=default_backend()
            )
            
            self.encryption_key = base64.urlsafe_b64encode(kdf.derive(password))
            self.fernet = Fernet(self.encryption_key)
            
        except Exception as e:
            self.logger.error(f"Error setting up encryption: {str(e)}")
    
    def generate_jwt(self, user_id: str, claims: Optional[Dict] = None) -> str:
        """Generate JWT token."""
        try:
            payload = {
                "sub": user_id,
                "iat": datetime.utcnow(),
                "exp": datetime.utcnow() + timedelta(seconds=self.config.get('jwt_expiry', 3600))
            }
            
            if claims:
                payload.update(claims)
            
            return jwt.encode(
                payload,
                self._jwt_secret,
                algorithm="HS256"
            )
            
        except Exception as e:
            self.logger.error(f"Error generating JWT: {str(e)}")
            return ""
    
    def verify_jwt(self, token: str) -> Dict[str, Any]:
        """Verify JWT token."""
        try:
            return jwt.decode(
                token,
                self._jwt_secret,
                algorithms=["HS256"]
            )
        except jwt.ExpiredSignatureError:
            self.logger.warning("JWT token expired")
            return {}
        except jwt.InvalidTokenError:
            self.logger.warning("Invalid JWT token")
            return {}
        except Exception as e:
            self.logger.error(f"Error verifying JWT: {str(e)}")
            return {}
    
    def setup_2fa(self, user_id: str) -> Tuple[str, str]:
        """Setup two-factor authentication."""
        try:
            # Generate secret key
            secret = pyotp.random_base32()
            
            # Store secret
            self.redis.setex(
                f"2fa:{user_id}",
                timedelta(days=30),
                secret
            )
            
            # Generate provisioning URI
            totp = pyotp.TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                user_id,
                issuer_name="Panion"
            )
            
            # Generate QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            # Save QR code
            qr_path = Path("static/qrcodes") / f"{user_id}.png"
            qr_path.parent.mkdir(parents=True, exist_ok=True)
            qr.make_image().save(qr_path)
            
            return secret, str(qr_path)
            
        except Exception as e:
            self.logger.error(f"Error setting up 2FA: {str(e)}")
            return "", ""
    
    def verify_2fa(self, user_id: str, token: str) -> bool:
        """Verify two-factor authentication token."""
        try:
            # Get secret
            secret = self.redis.get(f"2fa:{user_id}")
            if not secret:
                return False
            
            # Verify token
            totp = pyotp.TOTP(secret.decode())
            return totp.verify(token)
            
        except Exception as e:
            self.logger.error(f"Error verifying 2FA: {str(e)}")
            return False
    
    def sign_request(self, data: Dict[str, Any], secret: str) -> str:
        """Sign request data."""
        try:
            # Sort data keys
            sorted_data = json.dumps(data, sort_keys=True)
            
            # Create signature
            signature = hmac.new(
                secret.encode(),
                sorted_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return signature
            
        except Exception as e:
            self.logger.error(f"Error signing request: {str(e)}")
            return ""
    
    def verify_request_signature(self, data: Dict[str, Any], signature: str, secret: str) -> bool:
        """Verify request signature."""
        try:
            # Sort data keys
            sorted_data = json.dumps(data, sort_keys=True)
            
            # Create expected signature
            expected_signature = hmac.new(
                secret.encode(),
                sorted_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            self.logger.error(f"Error verifying request signature: {str(e)}")
            return False
    
    def check_ip_access(self, ip: str) -> bool:
        """Check if IP address is allowed."""
        try:
            # Check blacklist
            if ip in self.config.get('ip_blacklist', []):
                return False
                
            # Check whitelist
            if self.config.get('ip_whitelist', []):
                return ip in self.config.get('ip_whitelist', [])
                
            return True
            
        except Exception as e:
            self.logger.error(f"Error checking IP access: {str(e)}")
            return False
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt data using Fernet."""
        try:
            return self.fernet.encrypt(data.encode()).decode()
        except Exception as e:
            self.logger.error(f"Error encrypting data: {str(e)}")
            return ""
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt data using Fernet."""
        try:
            return self.fernet.decrypt(encrypted_data.encode()).decode()
        except Exception as e:
            self.logger.error(f"Error decrypting data: {str(e)}")
            return ""
    
    def log_security_event(self, event_type: str, details: Dict[str, Any]) -> None:
        """Log security event."""
        try:
            event = {
                "timestamp": datetime.utcnow().isoformat(),
                "type": event_type,
                "details": details
            }
            
            self.redis.lpush("security_events", json.dumps(event))
            
            # Trim list to last 1000 events
            self.redis.ltrim("security_events", 0, 999)
            
        except Exception as e:
            self.logger.error(f"Error logging security event: {str(e)}")
    
    def get_security_headers(self) -> Dict[str, str]:
        """Get security headers for HTTP responses."""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Content-Security-Policy": "default-src 'self'",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains" if self.config.get('ssl_enabled', True) else "",
            "Access-Control-Allow-Origin": ", ".join(self.config.get('allowed_origins', ["*"]))
        }

    async def initialize(self) -> None:
        """Initialize the security manager."""
        try:
            reflection_system.log_thought(
                "security_initialization",
                "Initializing security manager",
                {"stage": "begin"}
            )
            
            # Load API keys
            await self._load_api_keys()
            
            # Initialize security monitoring
            self._violation_log = []
            
            self._is_initialized = True
            
            reflection_system.log_thought(
                "security_initialization",
                "Security manager initialized",
                {"stage": "complete"}
            )
            
        except Exception as e:
            reflection_system.log_thought(
                "security_initialization",
                f"Error initializing security manager: {str(e)}",
                {"error": str(e)}
            )
            raise

    async def _load_api_keys(self) -> None:
        """Load API keys from storage."""
        try:
            api_keys_path = Path("data/security/api_keys.json")
            if api_keys_path.exists():
                with open(api_keys_path) as f:
                    self._api_keys = json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading API keys: {e}")
            self._api_keys = {}

    async def _save_api_keys(self) -> None:
        """Save API keys to storage."""
        try:
            api_keys_path = Path("data/security/api_keys.json")
            api_keys_path.parent.mkdir(parents=True, exist_ok=True)
            with open(api_keys_path, 'w') as f:
                json.dump(self._api_keys, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving API keys: {e}")

    async def start_monitoring(self) -> None:
        """Start security monitoring."""
        if not self._is_initialized:
            raise RuntimeError("Security manager not initialized")
        
        self._is_monitoring = True
        reflection_system.log_thought(
            "security_monitoring",
            "Security monitoring started",
            {"status": "active"}
        )

    async def stop_monitoring(self) -> None:
        """Stop security monitoring."""
        self._is_monitoring = False
        reflection_system.log_thought(
            "security_monitoring",
            "Security monitoring stopped",
            {"status": "inactive"}
        )

    def require_auth(self, required_roles: Optional[List[str]] = None):
        """Decorator for requiring authentication."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Get token from request
                token = kwargs.get('token')
                if not token:
                    raise SecurityError("No authentication token provided")
                
                # Verify token
                try:
                    payload = jwt.decode(token, self._jwt_secret, algorithms=['HS256'])
                    user_id = payload.get('user_id')
                    roles = payload.get('roles', [])
                    
                    # Check roles if required
                    if required_roles and not any(role in roles for role in required_roles):
                        raise SecurityError("Insufficient permissions")
                    
                    # Add user info to kwargs
                    kwargs['user_id'] = user_id
                    kwargs['user_roles'] = roles
                    
                    return await func(*args, **kwargs)
                    
                except jwt.InvalidTokenError:
                    raise SecurityError("Invalid authentication token")
                
            return wrapper
        return decorator

    async def authenticate(self, username: str, password: str) -> str:
        """Authenticate a user and return a JWT token."""
        # In a real system, you would validate against a user database
        # This is a simplified example
        if username == "admin" and password == "admin":
            token = jwt.encode(
                {
                    'user_id': 'admin',
                    'roles': ['admin'],
                    'exp': datetime.utcnow() + self._token_expiry
                },
                self._jwt_secret,
                algorithm='HS256'
            )
            return token
        raise SecurityError("Invalid credentials")

    async def validate_api_key(self, api_key: str) -> bool:
        """Validate an API key."""
        return api_key in self._api_keys

    async def generate_api_key(self, name: str, permissions: List[str]) -> str:
        """Generate a new API key."""
        api_key = bcrypt.gensalt().decode()
        self._api_keys[api_key] = {
            'name': name,
            'permissions': permissions,
            'created_at': datetime.now().isoformat()
        }
        await self._save_api_keys()
        return api_key

    async def revoke_api_key(self, api_key: str) -> None:
        """Revoke an API key."""
        if api_key in self._api_keys:
            del self._api_keys[api_key]
            await self._save_api_keys()

    async def log_violation(self, violation_type: str, details: Dict[str, Any]) -> None:
        """Log a security violation."""
        if not self._is_monitoring:
            return
        
        violation = {
            'type': violation_type,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        self._violation_log.append(violation)
        
        # Check for violation threshold
        recent_violations = [
            v for v in self._violation_log
            if datetime.fromisoformat(v['timestamp']) > datetime.now() - self._violation_window
        ]
        
        if len(recent_violations) >= self._max_violations:
            reflection_system.log_thought(
                "security_violation",
                f"Security violation threshold exceeded: {len(recent_violations)} violations in {self._violation_window}",
                {"violations": recent_violations}
            )
            # In a real system, you might want to take action here
            # For example, blocking the IP, notifying administrators, etc.

    async def get_security_state(self) -> Dict[str, Any]:
        """Get current security state."""
        return {
            'is_initialized': self._is_initialized,
            'is_monitoring': self._is_monitoring,
            'api_keys_count': len(self._api_keys),
            'violations_count': len(self._violation_log),
            'recent_violations': self._violation_log[-10:] if self._violation_log else []
        }

class SecurityError(Exception):
    """Security-related error."""
    pass

# Create singleton instance
security_manager = SecurityManager() 