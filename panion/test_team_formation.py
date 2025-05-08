"""
Test Team Formation
Demonstrates the team formation system with example agent profiles.
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
import json
import sys
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

# Define required types if not available
class GoalType(Enum):
    PLUGIN_CREATION = "plugin_creation"
    PLUGIN_TESTING = "plugin_testing"
    PLUGIN_UPDATE = "plugin_update"

@dataclass
class AgentProfile:
    """Profile of an agent in the team formation system."""
    id: str
    name: str
    skills: Dict[str, float]  # skill -> confidence score
    capabilities: List[str]
    availability: bool
    current_team: Optional[str]
    performance_metrics: Dict[str, float]

@dataclass
class TeamRequirement:
    """Requirements for team formation."""
    required_skills: Dict[str, float]  # skill -> minimum required confidence
    min_agents: int
    max_agents: int
    priority: str
    deadline: datetime

class ReflectionSystem:
    """Simple reflection system for testing."""
    def log_thought(self, thought: str, metadata: Optional[Dict[str, Any]] = None):
        logging.info(f"Reflection: {thought}")
        if metadata:
            logging.info(f"Metadata: {metadata}")

class TeamFormationManager:
    """Manages formation of agent teams for goal execution."""
    def __init__(self, reflection_system: ReflectionSystem):
        self.reflection_system = reflection_system
        self.data_dir = Path("data")
        self.agents_file = self.data_dir / "agent_profiles.json"
        self.teams_file = self.data_dir / "active_teams.json"
        self.agents_file.parent.mkdir(parents=True, exist_ok=True)
        
    def form_team(self, requirements: TeamRequirement) -> Optional[List[AgentProfile]]:
        """Form a team based on requirements."""
        try:
            # Load agent profiles
            with open(self.agents_file, 'r') as f:
                profiles_data = json.load(f)
            
            # Convert to AgentProfile objects
            available_agents = [
                AgentProfile(
                    id=agent_id,
                    name=data['name'],
                    skills=data['skills'],
                    capabilities=data['capabilities'],
                    availability=data['availability'],
                    current_team=data.get('current_team'),
                    performance_metrics=data['performance_metrics']
                )
                for agent_id, data in profiles_data.items()
                if data['availability'] and not data.get('current_team')
            ]
            
            # Filter agents by required skills
            qualified_agents = []
            for agent in available_agents:
                qualified = True
                for skill, min_score in requirements.required_skills.items():
                    if agent.skills.get(skill, 0) < min_score:
                        qualified = False
                        break
                if qualified:
                    qualified_agents.append(agent)
            
            # Sort by overall skill score
            sorted_agents = sorted(
                qualified_agents,
                key=lambda x: sum(x.skills.values()),
                reverse=True
            )
            
            # Select team
            team_size = min(
                len(sorted_agents),
                requirements.max_agents
            )
            if team_size < requirements.min_agents:
                return None
                
            return sorted_agents[:team_size]
            
        except Exception as e:
            logging.error(f"Error forming team: {e}")
            return None
            
    def assign_team(self, goal_id: str, goal_type: GoalType, required_plugins: List[str]) -> Dict[str, str]:
        """Assign roles to team members."""
        try:
            # Create requirements based on goal type
            requirements = TeamRequirement(
                required_skills={
                    "coding": 0.8,
                    "testing": 0.7,
                    "problem_solving": 0.8,
                    "communication": 0.7
                },
                min_agents=2,
                max_agents=3,
                priority="high",
                deadline=datetime.now()
            )
            
            # Form team
            team = self.form_team(requirements)
            if not team:
                return {}
            
            # Sort by skill scores
            sorted_team = sorted(
                team,
                key=lambda x: sum(x.skills.values()),
                reverse=True
            )
            
            # Assign roles
            role_mapping = {
                "planner": sorted_team[0].id,
                "executor": sorted_team[1].id
            }
            
            if len(sorted_team) > 2:
                if goal_type == GoalType.PLUGIN_CREATION:
                    role_mapping["refiner"] = sorted_team[2].id
                elif goal_type == GoalType.PLUGIN_TESTING:
                    role_mapping["tester"] = sorted_team[2].id
            
            return role_mapping
            
        except Exception as e:
            logging.error(f"Error assigning team: {e}")
            return {}
            
    def disband_team(self, team_id: str) -> bool:
        """Disband a team and update agent availability."""
        try:
            # Load teams data
            teams = []
            if self.teams_file.exists():
                with open(self.teams_file, 'r') as f:
                    teams = json.load(f)
            
            # Add new team with disbanded status
            teams.append({
                "id": team_id,
                "status": "disbanded",
                "disbanded_at": datetime.now().isoformat()
            })
            
            # Save updated teams
            with open(self.teams_file, 'w') as f:
                json.dump(teams, f, indent=2)
            
            return True
            
        except Exception as e:
            logging.error(f"Error disbanding team: {e}")
            return False

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_test_agents() -> Dict[str, AgentProfile]:
    """Create test agent profiles."""
    agents = {
        "agent1": AgentProfile(
            id="agent1",
            name="Alice",
            skills={
                "coding": 0.9,
                "testing": 0.8,
                "problem_solving": 0.9,
                "communication": 0.8
            },
            capabilities=["development", "testing", "planning"],
            availability=True,
            current_team=None,
            performance_metrics={"success_rate": 0.95}
        ),
        "agent2": AgentProfile(
            id="agent2",
            name="Bob",
            skills={
                "coding": 0.7,
                "testing": 0.9,
                "problem_solving": 0.8,
                "communication": 0.7
            },
            capabilities=["testing", "debugging", "analysis"],
            availability=True,
            current_team=None,
            performance_metrics={"success_rate": 0.88}
        ),
        "agent3": AgentProfile(
            id="agent3",
            name="Charlie",
            skills={
                "coding": 0.8,
                "testing": 0.7,
                "problem_solving": 0.9,
                "communication": 0.9
            },
            capabilities=["planning", "coordination", "development"],
            availability=True,
            current_team=None,
            performance_metrics={"success_rate": 0.92}
        )
    }
    
    # Save agent profiles
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    
    with open(data_dir / "agent_profiles.json", "w") as f:
        json.dump({
            agent_id: {
                "name": profile.name,
                "skills": profile.skills,
                "capabilities": profile.capabilities,
                "availability": profile.availability,
                "current_team": profile.current_team,
                "performance_metrics": profile.performance_metrics
            }
            for agent_id, profile in agents.items()
        }, f, indent=2)
    
    return agents

async def test_team_formation():
    """Test the team formation system."""
    try:
        # Initialize components
        reflection_system = ReflectionSystem()
        team_manager = TeamFormationManager(reflection_system)
        
        # Create test agents
        logger.info("Creating test agents...")
        agents = await create_test_agents()
        
        # Test team formation for plugin creation
        logger.info("\nTesting team formation for plugin creation...")
        requirements = TeamRequirement(
            required_skills={
                "coding": 0.8,
                "testing": 0.7,
                "problem_solving": 0.8,
                "communication": 0.7
            },
            min_agents=2,
            max_agents=3,
            priority="high",
            deadline=datetime.now()
        )
        
        team = team_manager.form_team(requirements)
        if team:
            logger.info(f"Team formed successfully with {len(team)} members:")
            for agent in team:
                logger.info(f"- {agent.name} (ID: {agent.id})")
                logger.info(f"  Skills: {agent.skills}")
                logger.info(f"  Capabilities: {agent.capabilities}")
        else:
            logger.error("Failed to form team")
        
        # Test team assignment for a goal
        logger.info("\nTesting team assignment for a goal...")
        goal_id = "test_goal_1"
        goal_type = GoalType.PLUGIN_CREATION
        required_plugins = ["plugin_manager", "file_editor"]
        
        role_mapping = team_manager.assign_team(goal_id, goal_type, required_plugins)
        if role_mapping:
            logger.info(f"Team assigned successfully for goal {goal_id}:")
            for role, agent_id in role_mapping.items():
                logger.info(f"- {role}: {agent_id}")
        else:
            logger.error("Failed to assign team for goal")
        
        # Test team disbanding
        if team:
            logger.info("\nTesting team disbanding...")
            team_id = f"team_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            success = team_manager.disband_team(team_id)
            if success:
                logger.info("Team disbanded successfully")
            else:
                logger.error("Failed to disband team")
        
    except Exception as e:
        logger.error(f"Error in test: {e}")

if __name__ == "__main__":
    asyncio.run(test_team_formation()) 