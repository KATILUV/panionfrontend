"""
Validators for the Panion system.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
from pathlib import Path
import re

from .schemas import (
    BaseValidator,
    StringValidator,
    NumberValidator,
    ListValidator,
    DictValidator,
    DateTimeValidator
)

class GoalValidator(BaseValidator):
    """Validator for goal data."""
    
    def __init__(self):
        self.name_validator = StringValidator(min_length=1, max_length=100)
        self.description_validator = StringValidator(min_length=1, max_length=1000)
        self.priority_validator = NumberValidator(min_value=1, max_value=5)
        self.deadline_validator = DateTimeValidator(min_date=datetime.now())
        
        self.team_requirements_validator = DictValidator(
            required_keys=["min_size", "max_size", "required_skills"],
            value_validator=DictValidator(
                key_validator=StringValidator(),
                value_validator=NumberValidator(min_value=0, max_value=1)
            )
        )
        
        self.subtasks_validator = ListValidator(
            min_length=1,
            item_validator=DictValidator(
                required_keys=["name", "description", "resources"],
                value_validator=DictValidator(
                    key_validator=StringValidator(),
                    value_validator=NumberValidator(min_value=0)
                )
            )
        )
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate goal data.
        
        Args:
            data: Goal data to validate
            
        Returns:
            bool: True if goal data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["name", "description", "priority", "deadline", "team_requirements", "subtasks"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate name
        if not self.name_validator.validate(data["name"]):
            return False
            
        # Validate description
        if not self.description_validator.validate(data["description"]):
            return False
            
        # Validate priority
        if not self.priority_validator.validate(data["priority"]):
            return False
            
        # Validate deadline
        if not self.deadline_validator.validate(datetime.fromisoformat(data["deadline"])):
            return False
            
        # Validate team requirements
        if not self.team_requirements_validator.validate(data["team_requirements"]):
            return False
            
        # Validate subtasks
        if not self.subtasks_validator.validate(data["subtasks"]):
            return False
            
        return True

class TeamValidator(BaseValidator):
    """Validator for team data."""
    
    def __init__(self):
        self.name_validator = StringValidator(min_length=1, max_length=100)
        self.members_validator = ListValidator(
            min_length=1,
            item_validator=DictValidator(
                required_keys=["id", "name", "skills", "capabilities"],
                value_validator=DictValidator(
                    key_validator=StringValidator(),
                    value_validator=NumberValidator(min_value=0, max_value=1)
                )
            )
        )
        self.roles_validator = DictValidator(
            required_keys=["planner", "executor", "reviewer"],
            value_validator=StringValidator()
        )
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate team data.
        
        Args:
            data: Team data to validate
            
        Returns:
            bool: True if team data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["name", "members", "roles"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate name
        if not self.name_validator.validate(data["name"]):
            return False
            
        # Validate members
        if not self.members_validator.validate(data["members"]):
            return False
            
        # Validate roles
        if not self.roles_validator.validate(data["roles"]):
            return False
            
        return True

class AgentValidator(BaseValidator):
    """Validator for agent data."""
    
    def __init__(self):
        self.id_validator = StringValidator(min_length=1, max_length=50)
        self.name_validator = StringValidator(min_length=1, max_length=100)
        self.skills_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=NumberValidator(min_value=0, max_value=1)
        )
        self.capabilities_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=NumberValidator(min_value=0, max_value=1)
        )
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate agent data.
        
        Args:
            data: Agent data to validate
            
        Returns:
            bool: True if agent data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["id", "name", "skills", "capabilities"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate id
        if not self.id_validator.validate(data["id"]):
            return False
            
        # Validate name
        if not self.name_validator.validate(data["name"]):
            return False
            
        # Validate skills
        if not self.skills_validator.validate(data["skills"]):
            return False
            
        # Validate capabilities
        if not self.capabilities_validator.validate(data["capabilities"]):
            return False
            
        return True

class ResourceValidator(BaseValidator):
    """Validator for resource data."""
    
    def __init__(self):
        self.type_validator = StringValidator(min_length=1, max_length=50)
        self.amount_validator = NumberValidator(min_value=0)
        self.priority_validator = NumberValidator(min_value=0, max_value=10)
        self.duration_validator = NumberValidator(min_value=0)
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate resource data.
        
        Args:
            data: Resource data to validate
            
        Returns:
            bool: True if resource data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["type", "amount"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate type
        if not self.type_validator.validate(data["type"]):
            return False
            
        # Validate amount
        if not self.amount_validator.validate(data["amount"]):
            return False
            
        # Validate optional fields
        if "priority" in data and not self.priority_validator.validate(data["priority"]):
            return False
            
        if "duration" in data and not self.duration_validator.validate(data["duration"]):
            return False
            
        return True

class PluginConfigValidator(BaseValidator):
    """Validator for plugin configuration data."""
    
    def __init__(self):
        self.name_validator = StringValidator(min_length=1, max_length=100)
        self.version_validator = StringValidator(pattern=r'^\d+\.\d+\.\d+$')
        self.type_validator = StringValidator(min_length=1, max_length=50)
        self.config_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=StringValidator()
        )
        self.dependencies_validator = ListValidator(
            item_validator=StringValidator(min_length=1)
        )
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate plugin configuration data.
        
        Args:
            data: Plugin configuration data to validate
            
        Returns:
            bool: True if plugin configuration data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["name", "version", "type"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate name
        if not self.name_validator.validate(data["name"]):
            return False
            
        # Validate version
        if not self.version_validator.validate(data["version"]):
            return False
            
        # Validate type
        if not self.type_validator.validate(data["type"]):
            return False
            
        # Validate optional fields
        if "config" in data and not self.config_validator.validate(data["config"]):
            return False
            
        if "dependencies" in data and not self.dependencies_validator.validate(data["dependencies"]):
            return False
            
        return True

class APIRequestValidator(BaseValidator):
    """Validator for API request data."""
    
    def __init__(self):
        self.action_validator = StringValidator(
            min_length=1,
            max_length=50,
            pattern=r'^[a-zA-Z_][a-zA-Z0-9_]*$'
        )
        self.parameters_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=StringValidator()
        )
        self.headers_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=StringValidator()
        )
        self.query_params_validator = DictValidator(
            key_validator=StringValidator(),
            value_validator=StringValidator()
        )
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Validate API request data.
        
        Args:
            data: API request data to validate
            
        Returns:
            bool: True if API request data is valid
        """
        if not isinstance(data, dict):
            return False
            
        # Validate required fields
        required_fields = ["action", "parameters"]
        for field in required_fields:
            if field not in data:
                return False
        
        # Validate action
        if not self.action_validator.validate(data["action"]):
            return False
            
        # Validate parameters
        if not self.parameters_validator.validate(data["parameters"]):
            return False
            
        # Validate optional fields
        if "headers" in data and not self.headers_validator.validate(data["headers"]):
            return False
            
        if "query_params" in data and not self.query_params_validator.validate(data["query_params"]):
            return False
            
        return True

# Create validator instances
goal_validator = GoalValidator()
team_validator = TeamValidator()
agent_validator = AgentValidator()
resource_validator = ResourceValidator()
plugin_config_validator = PluginConfigValidator()
api_request_validator = APIRequestValidator() 