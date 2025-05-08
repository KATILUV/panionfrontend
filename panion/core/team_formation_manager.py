"""
Team Formation Manager
Handles agent team formation and role assignment for goals.
"""

import logging
from typing import Dict, List, Optional, Set, Any
from datetime import datetime
from pathlib import Path
import json
import yaml
from dataclasses import dataclass, field
import networkx as nx
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from .agent_spawner import AgentSpawner
from .reflection_system import ReflectionSystem
from .plugin_types import GoalType, PluginError

logger = logging.getLogger(__name__)

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

class TeamFormationManager:
    """Manages formation of agent teams for goal execution"""
    
    def __init__(
        self,
        agent_spawner: AgentSpawner,
        reflection_system: ReflectionSystem,
        config_path: str = "config/team_formation_config.yaml"
    ):
        self.agent_spawner = agent_spawner
        self.reflection_system = reflection_system
        self.config = self._load_config(config_path)
        self.data_dir = Path("data")
        self.agents_file = self.data_dir / "agent_profiles.json"
        self.teams_file = self.data_dir / "active_teams.json"
        self.agents_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize agent network
        self.agent_network = nx.Graph()
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Error loading config: {str(e)}")
            return {
                "min_skill_match": 0.7,
                "max_team_size": 5,
                "team_formation_timeout": 300,  # seconds
                "skill_weights": {
                    "technical": 1.0,
                    "communication": 0.8,
                    "problem_solving": 0.9
                }
            }
            
    def load_agent_profiles(self) -> Dict[str, AgentProfile]:
        """Load agent profiles from file."""
        try:
            if not self.agents_file.exists():
                return {}
            
            with open(self.agents_file, 'r') as f:
                data = json.load(f)
            
            return {
                agent_id: AgentProfile(
                    id=agent_id,
                    name=profile["name"],
                    skills=profile["skills"],
                    capabilities=profile["capabilities"],
                    availability=profile["availability"],
                    current_team=profile.get("current_team"),
                    performance_metrics=profile["performance_metrics"]
                )
                for agent_id, profile in data.items()
            }
        except Exception as e:
            logger.error(f"Error loading agent profiles: {str(e)}")
            return {}
            
    def discover_agents(self) -> List[AgentProfile]:
        """Discover available agents and update the agent network."""
        try:
            profiles = self.load_agent_profiles()
            available_agents = [
                profile for profile in profiles.values()
                if profile.availability and not profile.current_team
            ]
            
            # Update agent network
            self._update_agent_network(available_agents)
            
            return available_agents
        except Exception as e:
            logger.error(f"Error discovering agents: {str(e)}")
            return []
            
    def _update_agent_network(self, agents: List[AgentProfile]) -> None:
        """Update the agent collaboration network."""
        self.agent_network.clear()
        
        # Add nodes
        for agent in agents:
            self.agent_network.add_node(
                agent.id,
                skills=agent.skills,
                capabilities=agent.capabilities
            )
        
        # Add edges based on skill compatibility
        for i, agent1 in enumerate(agents):
            for agent2 in agents[i+1:]:
                compatibility = self._calculate_compatibility(agent1, agent2)
                if compatibility > self.config["min_skill_match"]:
                    self.agent_network.add_edge(
                        agent1.id,
                        agent2.id,
                        weight=compatibility
                    )
                    
    def _calculate_compatibility(self, agent1: AgentProfile, agent2: AgentProfile) -> float:
        """Calculate compatibility score between two agents."""
        # Convert skills to vectors
        all_skills = set(agent1.skills.keys()) | set(agent2.skills.keys())
        vec1 = np.array([agent1.skills.get(skill, 0) for skill in all_skills])
        vec2 = np.array([agent2.skills.get(skill, 0) for skill in all_skills])
        
        # Calculate cosine similarity
        similarity = cosine_similarity([vec1], [vec2])[0][0]
        
        # Adjust for complementary skills
        complementary_score = len(set(agent1.capabilities) & set(agent2.capabilities)) / len(all_skills)
        
        return 0.7 * similarity + 0.3 * complementary_score
        
    def assign_team(self, goal_id: str, goal_type: GoalType, required_plugins: List[str]) -> Dict[str, str]:
        """
        Assign a team of agents to handle a goal
        
        Args:
            goal_id: ID of the goal to assign team for
            goal_type: Type of goal (e.g., PLUGIN_CREATION, PLUGIN_TESTING)
            required_plugins: List of plugin IDs required for the goal
            
        Returns:
            Dictionary mapping agent roles to agent IDs
            
        Raises:
            PluginError: If team assignment fails
        """
        try:
            # Log team formation start
            self.reflection_system.log_thought(
                f"Starting team formation for goal {goal_id}",
                metadata={
                    "goal_id": goal_id,
                    "goal_type": goal_type.value,
                    "required_plugins": required_plugins
                }
            )
            
            # Create team requirements
            requirements = TeamRequirement(
                required_skills=self._get_required_skills(goal_type, required_plugins),
                min_agents=2,  # Minimum team size
                max_agents=self.config["max_team_size"],
                priority="high",
                deadline=datetime.now()
            )
            
            # Form team
            team = self.form_team(requirements)
            if not team:
                raise PluginError(f"Failed to form team for goal {goal_id}")
            
            # Map team members to roles
            role_mapping = self._map_team_to_roles(team, goal_type)
            
            # Log team formation completion
            self.reflection_system.log_thought(
                f"Team formation completed for goal {goal_id}",
                metadata={
                    "goal_id": goal_id,
                    "team": role_mapping
                }
            )
            
            return role_mapping
            
        except Exception as e:
            error_msg = f"Failed to assign team for goal {goal_id}: {str(e)}"
            logger.error(error_msg)
            self.reflection_system.log_thought(
                error_msg,
                metadata={
                    "goal_id": goal_id,
                    "error": str(e)
                }
            )
            raise PluginError(error_msg)
            
    def _get_required_skills(self, goal_type: GoalType, required_plugins: List[str]) -> Dict[str, float]:
        """Get required skills for a goal type and its plugins."""
        base_skills = {
            "problem_solving": 0.8,
            "communication": 0.7
        }
        
        if goal_type == GoalType.PLUGIN_CREATION:
            base_skills.update({
                "coding": 0.9,
                "testing": 0.8
            })
        elif goal_type == GoalType.PLUGIN_TESTING:
            base_skills.update({
                "testing": 0.9,
                "debugging": 0.8
            })
            
        return base_skills
        
    def _map_team_to_roles(self, team: List[AgentProfile], goal_type: GoalType) -> Dict[str, str]:
        """Map team members to appropriate roles based on their skills."""
        role_mapping = {}
        
        # Sort team members by skill scores
        sorted_team = sorted(
            team,
            key=lambda x: sum(x.skills.values()),
            reverse=True
        )
        
        # Assign roles based on skills and goal type
        if goal_type == GoalType.PLUGIN_CREATION:
            role_mapping["planner"] = sorted_team[0].id
            role_mapping["executor"] = sorted_team[1].id
            if len(sorted_team) > 2:
                role_mapping["refiner"] = sorted_team[2].id
        elif goal_type == GoalType.PLUGIN_TESTING:
            role_mapping["planner"] = sorted_team[0].id
            role_mapping["executor"] = sorted_team[1].id
            if len(sorted_team) > 2:
                role_mapping["tester"] = sorted_team[2].id
        else:
            role_mapping["planner"] = sorted_team[0].id
            role_mapping["executor"] = sorted_team[1].id
            
        return role_mapping
        
    def form_team(self, requirements: TeamRequirement) -> Optional[List[AgentProfile]]:
        """Form a team based on mission requirements."""
        try:
            available_agents = self.discover_agents()
            if not available_agents:
                logger.warning("No available agents found")
                return None
            
            # Find agents matching required skills
            candidate_agents = self._find_candidate_agents(available_agents, requirements)
            if not candidate_agents:
                logger.warning("No agents match the required skills")
                return None
            
            # Form team using network analysis
            team = self._select_team_members(candidate_agents, requirements)
            if not team:
                logger.warning("Failed to form a compatible team")
                return None
            
            # Update agent profiles
            self._update_agent_team_assignments(team)
            
            return team
        except Exception as e:
            logger.error(f"Error forming team: {str(e)}")
            return None
            
    def _find_candidate_agents(self, agents: List[AgentProfile], requirements: TeamRequirement) -> List[AgentProfile]:
        """Find agents that match the required skills."""
        candidates = []
        
        for agent in agents:
            matches = True
            for skill, min_confidence in requirements.required_skills.items():
                if agent.skills.get(skill, 0) < min_confidence:
                    matches = False
                    break
            
            if matches:
                candidates.append(agent)
        
        return candidates
        
    def _select_team_members(self, candidates: List[AgentProfile], requirements: TeamRequirement) -> Optional[List[AgentProfile]]:
        """Select team members using network analysis."""
        try:
            # Create subgraph of candidate agents
            candidate_graph = self.agent_network.subgraph([agent.id for agent in candidates])
            
            # Find the most connected group
            best_team = None
            max_connectivity = -1
            
            for size in range(requirements.min_agents, min(requirements.max_agents, len(candidates)) + 1):
                # Try different combinations
                for team_ids in nx.find_cliques(candidate_graph):
                    if len(team_ids) == size:
                        # Calculate team connectivity
                        connectivity = sum(
                            candidate_graph[u][v]["weight"]
                            for u, v in nx.combinations(team_ids, 2)
                            if candidate_graph.has_edge(u, v)
                        )
                        
                        if connectivity > max_connectivity:
                            max_connectivity = connectivity
                            best_team = [agent for agent in candidates if agent.id in team_ids]
            
            return best_team
        except Exception as e:
            logger.error(f"Error selecting team members: {str(e)}")
            return None
            
    def _update_agent_team_assignments(self, team: List[AgentProfile]) -> None:
        """Update agent profiles with team assignments."""
        try:
            profiles = self.load_agent_profiles()
            team_id = f"team_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Update profiles
            for agent in team:
                if agent.id in profiles:
                    profiles[agent.id]["current_team"] = team_id
                    profiles[agent.id]["availability"] = False
            
            # Save updated profiles
            with open(self.agents_file, 'w') as f:
                json.dump(profiles, f, indent=2)
            
            # Save team information
            team_data = {
                "id": team_id,
                "members": [agent.id for agent in team],
                "formed_at": datetime.now().isoformat(),
                "status": "active"
            }
            
            teams = []
            if self.teams_file.exists():
                with open(self.teams_file, 'r') as f:
                    teams = json.load(f)
            
            teams.append(team_data)
            
            with open(self.teams_file, 'w') as f:
                json.dump(teams, f, indent=2)
        
        except Exception as e:
            logger.error(f"Error updating agent assignments: {str(e)}")
            
    def disband_team(self, team_id: str) -> bool:
        """Disband a team and update agent availability."""
        try:
            # Load teams data
            if not self.teams_file.exists():
                return False
            
            with open(self.teams_file, 'r') as f:
                teams = json.load(f)
            
            # Find and update team
            for team in teams:
                if team["id"] == team_id:
                    team["status"] = "disbanded"
                    team["disbanded_at"] = datetime.now().isoformat()
                    
                    # Update agent profiles
                    profiles = self.load_agent_profiles()
                    for agent_id in team["members"]:
                        if agent_id in profiles:
                            profiles[agent_id]["current_team"] = None
                            profiles[agent_id]["availability"] = True
                    
                    # Save updated profiles
                    with open(self.agents_file, 'w') as f:
                        json.dump(profiles, f, indent=2)
                    
                    # Save updated teams
                    with open(self.teams_file, 'w') as f:
                        json.dump(teams, f, indent=2)
                    
                    return True
            
            return False
        except Exception as e:
            logger.error(f"Error disbanding team: {str(e)}")
            return False 