"""
Team Formation Module
Manages team creation, role assignment, and team state management.
"""

from .manager import TeamFormationManager
from .models import TeamState, AgentProfile, RoleAssignment

__all__ = ['TeamFormationManager', 'TeamState', 'AgentProfile', 'RoleAssignment'] 