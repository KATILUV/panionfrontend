"""
Authentication and Authorization System
Handles user authentication, authorization, and security management.
"""

import logging
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
from pathlib import Path
import json
import secrets
import re

@dataclass
class User:
    """User information."""
    username: str
    password_hash: bytes
    roles: Set[str] = field(default_factory=set)
    is_active: bool = True
    last_login: Optional[datetime] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary."""
        return {
            "username": self.username,
            "password_hash": self.password_hash.hex(),
            "roles": list(self.roles),
            "is_active": self.is_active,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "failed_attempts": self.failed_attempts,
            "locked_until": self.locked_until.isoformat() if self.locked_until else None,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create user from dictionary."""
        return cls(
            username=data["username"],
            password_hash=bytes.fromhex(data["password_hash"]),
            roles=set(data["roles"]),
            is_active=data["is_active"],
            last_login=datetime.fromisoformat(data["last_login"]) if data["last_login"] else None,
            failed_attempts=data["failed_attempts"],
            locked_until=datetime.fromisoformat(data["locked_until"]) if data["locked_until"] else None,
            metadata=data["metadata"]
        )

class AuthManager:
    """Manages user authentication and session management."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.users_file = Path("data/users.json")
        self.users: Dict[str, Dict] = {}
        self._load_users()
    
    def _load_users(self) -> None:
        """Load users from the users file."""
        try:
            if self.users_file.exists():
                with open(self.users_file, 'r') as f:
                    self.users = json.load(f)
            else:
                self.users = {}
                self._save_users()
        except Exception as e:
            self.logger.error(f"Error loading users: {str(e)}")
            self.users = {}
    
    def _save_users(self) -> None:
        """Save users to the users file."""
        try:
            self.users_file.parent.mkdir(exist_ok=True)
            with open(self.users_file, 'w') as f:
                json.dump(self.users, f, indent=2)
        except Exception as e:
            self.logger.error(f"Error saving users: {str(e)}")
    
    def authenticate(self, username: str, password: str) -> bool:
        """Authenticate a user.
        
        Args:
            username: Username
            password: Password
            
        Returns:
            bool: True if authentication successful
        """
        if username not in self.users:
            return False
            
        stored_hash = self.users[username]["password"].encode()
        return bcrypt.checkpw(password.encode(), stored_hash)
    
    def create_user(self, username: str, password: str) -> bool:
        """Create a new user.
        
        Args:
            username: Username
            password: Password
            
        Returns:
            bool: True if user created successfully
        """
        if username in self.users:
            return False
            
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode(), salt)
        
        self.users[username] = {
            "password": hashed.decode(),
            "created_at": str(datetime.now())
        }
        
        self._save_users()
        return True
    
    def delete_user(self, username: str) -> bool:
        """Delete a user.
        
        Args:
            username: Username
            
        Returns:
            bool: True if user deleted successfully
        """
        if username not in self.users:
            return False
            
        del self.users[username]
        self._save_users()
        return True

# Global auth manager instance
auth_manager = AuthManager() 