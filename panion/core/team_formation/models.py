"""
Team Formation Models
Contains data models for team formation system.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime

@dataclass
class AgentProfile:
    """Represents an agent's profile with skills and capabilities."""
    agent_id: str
    name: str
    skills: Dict[str, float]
    capabilities: List[str]
    availability: bool = True
    current_team: Optional[str] = None
    performance_history: Dict[str, float] = field(default_factory=dict)

@dataclass
class RoleAssignment:
    """Represents a role assignment within a team."""
    role: str
    agent_id: str
    assigned_at: datetime = field(default_factory=datetime.now)
    performance_score: Optional[float] = None

@dataclass
class TeamState:
    """Represents the current state of a team."""
    team_id: str
    status: str  # 'forming', 'active', 'disbanded'
    members: List[str]
    roles: Dict[str, RoleAssignment]
    created_at: datetime = field(default_factory=datetime.now)
    disbanded_at: Optional[datetime] = None
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        """Convert team state to dictionary."""
        return {
            'team_id': self.team_id,
            'status': self.status,
            'members': self.members,
            'roles': {role: {
                'agent_id': assignment.agent_id,
                'assigned_at': assignment.assigned_at.isoformat(),
                'performance_score': assignment.performance_score
            } for role, assignment in self.roles.items()},
            'created_at': self.created_at.isoformat(),
            'disbanded_at': self.disbanded_at.isoformat() if self.disbanded_at else None,
            'performance_metrics': self.performance_metrics
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'TeamState':
        """Create team state from dictionary."""
        roles = {
            role: RoleAssignment(
                role=role,
                agent_id=role_data['agent_id'],
                assigned_at=datetime.fromisoformat(role_data['assigned_at']),
                performance_score=role_data['performance_score']
            ) for role, role_data in data['roles'].items()
        }
        
        return cls(
            team_id=data['team_id'],
            status=data['status'],
            members=data['members'],
            roles=roles,
            created_at=datetime.fromisoformat(data['created_at']),
            disbanded_at=datetime.fromisoformat(data['disbanded_at']) if data['disbanded_at'] else None,
            performance_metrics=data['performance_metrics']
        ) 