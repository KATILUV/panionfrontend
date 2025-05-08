"""
Team Formation Manager
Manages team creation, role assignment, and team state.
"""

import logging
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import uuid

from .models import TeamState, AgentProfile, RoleAssignment
from core.reflection import reflection_system
from core.learning_system import learning_system

logger = logging.getLogger(__name__)

class TeamFormationManager:
    """Manages team formation and role assignment."""
    
    def __init__(self):
        """Initialize the team formation manager."""
        self._teams: Dict[str, TeamState] = {}
        self._agents: Dict[str, AgentProfile] = {}
        self._role_configs: Dict[str, Dict[str, Any]] = {}
        self._skill_requirements: Dict[str, float] = {}
        self._data_dir: Optional[Path] = None
        self._lock = asyncio.Lock()
        
    async def initialize(
        self,
        data_dir: Path,
        role_configs: Dict[str, Dict[str, Any]],
        skill_requirements: Dict[str, float]
    ) -> None:
        """Initialize the team formation system.
        
        Args:
            data_dir: Directory for storing team data
            role_configs: Role configurations
            skill_requirements: Skill requirements
        """
        self._data_dir = data_dir
        self._role_configs = role_configs
        self._skill_requirements = skill_requirements
        
        # Create data directory
        self._data_dir.mkdir(parents=True, exist_ok=True)
        
        # Load existing teams and agents
        await self._load_data()
        
        # Start background tasks
        asyncio.create_task(self._monitor_teams())
        
    async def _load_data(self) -> None:
        """Load teams and agents from disk."""
        try:
            # Load teams
            teams_file = self._data_dir / "teams.json"
            if teams_file.exists():
                with open(teams_file, 'r') as f:
                    teams_data = json.load(f)
                    self._teams = {
                        team_id: TeamState.from_dict(data)
                        for team_id, data in teams_data.items()
                    }
            
            # Load agents
            agents_file = self._data_dir / "agents.json"
            if agents_file.exists():
                with open(agents_file, 'r') as f:
                    agents_data = json.load(f)
                    self._agents = {
                        agent_id: AgentProfile(
                            agent_id=agent_id,
                            name=data['name'],
                            skills=data['skills'],
                            capabilities=data['capabilities'],
                            availability=data['availability'],
                            current_team=data.get('current_team'),
                            performance_history=data.get('performance_history', {})
                        )
                        for agent_id, data in agents_data.items()
                    }
                    
        except Exception as e:
            logger.error(f"Error loading team formation data: {e}")
            
    async def _save_data(self) -> None:
        """Save teams and agents to disk."""
        try:
            async with self._lock:
                # Save teams
                teams_file = self._data_dir / "teams.json"
                with open(teams_file, 'w') as f:
                    json.dump({
                        team_id: team.to_dict()
                        for team_id, team in self._teams.items()
                    }, f, indent=2)
                
                # Save agents
                agents_file = self._data_dir / "agents.json"
                with open(agents_file, 'w') as f:
                    json.dump({
                        agent_id: {
                            'name': agent.name,
                            'skills': agent.skills,
                            'capabilities': agent.capabilities,
                            'availability': agent.availability,
                            'current_team': agent.current_team,
                            'performance_history': agent.performance_history
                        }
                        for agent_id, agent in self._agents.items()
                    }, f, indent=2)
                    
        except Exception as e:
            logger.error(f"Error saving team formation data: {e}")
            
    async def form_team(
        self,
        requirements: Dict[str, Any],
        role_requirements: Optional[Dict[str, Any]] = None
    ) -> Optional[TeamState]:
        """Form a new team based on requirements.
        
        Args:
            requirements: Team formation requirements
            role_requirements: Specific role requirements
            
        Returns:
            Optional[TeamState]: Formed team state or None if formation failed
        """
        try:
            async with self._lock:
                # Get available agents
                available_agents = [
                    agent for agent in self._agents.values()
                    if agent.availability and not agent.current_team
                ]
                
                if not available_agents:
                    logger.warning("No available agents for team formation")
                    return None
                
                # Filter agents by skill requirements
                qualified_agents = []
                for agent in available_agents:
                    qualified = True
                    for skill, min_level in self._skill_requirements.items():
                        if agent.skills.get(skill, 0) < min_level:
                            qualified = False
                            break
                    if qualified:
                        qualified_agents.append(agent)
                
                if not qualified_agents:
                    logger.warning("No agents meet skill requirements")
                    return None
                
                # Sort agents by overall skill score
                qualified_agents.sort(
                    key=lambda x: sum(x.skills.values()),
                    reverse=True
                )
                
                # Create team
                team_id = f"team_{uuid.uuid4().hex[:8]}"
                team_members = []
                role_assignments = {}
                
                # Assign roles
                if role_requirements:
                    for role, role_req in role_requirements.items():
                        if role not in self._role_configs:
                            logger.warning(f"Unknown role: {role}")
                            continue
                            
                        # Find best agent for role
                        best_agent = None
                        best_score = 0
                        
                        for agent in qualified_agents:
                            if agent.agent_id in team_members:
                                continue
                                
                            # Calculate role fit score
                            score = self._calculate_role_fit(agent, role)
                            if score > best_score:
                                best_score = score
                                best_agent = agent
                        
                        if best_agent:
                            team_members.append(best_agent.agent_id)
                            role_assignments[role] = RoleAssignment(
                                role=role,
                                agent_id=best_agent.agent_id
                            )
                
                # Add remaining agents if needed
                min_team_size = requirements.get('min_team_size', 2)
                while len(team_members) < min_team_size and qualified_agents:
                    agent = qualified_agents.pop(0)
                    if agent.agent_id not in team_members:
                        team_members.append(agent.agent_id)
                
                # Create team state
                team_state = TeamState(
                    team_id=team_id,
                    status='forming',
                    members=team_members,
                    roles=role_assignments
                )
                
                # Update agent states
                for agent_id in team_members:
                    self._agents[agent_id].current_team = team_id
                    self._agents[agent_id].availability = False
                
                # Save team
                self._teams[team_id] = team_state
                await self._save_data()
                
                # Log team formation
                reflection_system.log_thought(
                    f"Formed team {team_id} with {len(team_members)} members",
                    {
                        'team_id': team_id,
                        'members': team_members,
                        'roles': role_assignments
                    }
                )
                
                return team_state
                
        except Exception as e:
            logger.error(f"Error forming team: {e}")
            return None
            
    def _calculate_role_fit(self, agent: AgentProfile, role: str) -> float:
        """Calculate how well an agent fits a role.
        
        Args:
            agent: Agent profile
            role: Role to check
            
        Returns:
            float: Role fit score (0-1)
        """
        role_config = self._role_configs.get(role, {})
        required_capabilities = role_config.get('required_capabilities', [])
        min_skill_level = role_config.get('min_skill_level', 0.5)
        
        # Check capabilities
        capability_score = sum(
            1 for cap in required_capabilities
            if cap in agent.capabilities
        ) / len(required_capabilities) if required_capabilities else 0
        
        # Check skills
        skill_score = sum(
            agent.skills.get(skill, 0)
            for skill in self._skill_requirements
        ) / len(self._skill_requirements)
        
        # Combine scores
        return (capability_score * 0.6 + skill_score * 0.4)
        
    async def update_team_performance(
        self,
        team_id: str,
        metrics: Dict[str, float]
    ) -> bool:
        """Update team performance metrics.
        
        Args:
            team_id: Team ID
            metrics: Performance metrics
            
        Returns:
            bool: Whether update was successful
        """
        try:
            async with self._lock:
                if team_id not in self._teams:
                    logger.warning(f"Team not found: {team_id}")
                    return False
                    
                team = self._teams[team_id]
                
                # Update team metrics
                team.performance_metrics.update(metrics)
                
                # Update agent performance
                for agent_id in team.members:
                    if agent_id in self._agents:
                        agent = self._agents[agent_id]
                        agent.performance_history[team_id] = metrics
                
                # Save updates
                await self._save_data()
                
                # Log performance update
                reflection_system.log_thought(
                    f"Updated performance for team {team_id}",
                    {
                        'team_id': team_id,
                        'metrics': metrics
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error updating team performance: {e}")
            return False
            
    async def disband_team(self, team_id: str) -> bool:
        """Disband a team.
        
        Args:
            team_id: Team ID
            
        Returns:
            bool: Whether disband was successful
        """
        try:
            async with self._lock:
                if team_id not in self._teams:
                    logger.warning(f"Team not found: {team_id}")
                    return False
                    
                team = self._teams[team_id]
                
                # Update team state
                team.status = 'disbanded'
                team.disbanded_at = datetime.now()
                
                # Update agent states
                for agent_id in team.members:
                    if agent_id in self._agents:
                        agent = self._agents[agent_id]
                        agent.current_team = None
                        agent.availability = True
                
                # Save updates
                await self._save_data()
                
                # Log team disband
                reflection_system.log_thought(
                    f"Disbanded team {team_id}",
                    {
                        'team_id': team_id,
                        'members': team.members
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error disbanding team: {e}")
            return False
            
    async def _monitor_teams(self) -> None:
        """Monitor teams for health and performance."""
        while True:
            try:
                async with self._lock:
                    for team_id, team in self._teams.items():
                        if team.status == 'active':
                            # Check team health
                            if self._check_team_health(team):
                                # Update team performance
                                await self.update_team_performance(
                                    team_id,
                                    self._calculate_team_metrics(team)
                                )
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error monitoring teams: {e}")
                await asyncio.sleep(60)
                
    def _check_team_health(self, team: TeamState) -> bool:
        """Check if a team is healthy.
        
        Args:
            team: Team state
            
        Returns:
            bool: Whether team is healthy
        """
        # Check if all members are still available
        for agent_id in team.members:
            if agent_id not in self._agents:
                return False
            if not self._agents[agent_id].availability:
                return False
        return True
        
    def _calculate_team_metrics(self, team: TeamState) -> Dict[str, float]:
        """Calculate team performance metrics.
        
        Args:
            team: Team state
            
        Returns:
            Dict[str, float]: Performance metrics
        """
        metrics = {
            'goal_success': 0.0,
            'completion_time': 0.0,
            'collaboration_score': 0.0
        }
        
        # Calculate metrics based on team performance history
        if team.performance_metrics:
            metrics.update(team.performance_metrics)
            
        return metrics
        
    async def cleanup(self) -> None:
        """Clean up resources."""
        try:
            # Save final state
            await self._save_data()
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            
    async def create_agent(
        self,
        name: str,
        skills: Dict[str, float],
        capabilities: List[str]
    ) -> Optional[str]:
        """Create a new agent.
        
        Args:
            name: Agent name
            skills: Agent skills and levels
            capabilities: Agent capabilities
            
        Returns:
            Optional[str]: Agent ID if creation successful
        """
        try:
            async with self._lock:
                # Generate agent ID
                agent_id = f"agent_{uuid.uuid4().hex[:8]}"
                
                # Create agent profile
                agent = AgentProfile(
                    agent_id=agent_id,
                    name=name,
                    skills=skills,
                    capabilities=capabilities,
                    availability=True,
                    current_team=None,
                    performance_history={}
                )
                
                # Add agent
                self._agents[agent_id] = agent
                
                # Save data
                await self._save_data()
                
                # Log agent creation
                reflection_system.log_thought(
                    f"Created agent {name} (ID: {agent_id})",
                    {
                        'agent_id': agent_id,
                        'skills': skills,
                        'capabilities': capabilities
                    }
                )
                
                return agent_id
                
        except Exception as e:
            logger.error(f"Error creating agent: {e}")
            return None
            
    async def update_agent(
        self,
        agent_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Update an agent's profile.
        
        Args:
            agent_id: Agent ID
            updates: Updates to apply
            
        Returns:
            bool: Whether update was successful
        """
        try:
            async with self._lock:
                if agent_id not in self._agents:
                    logger.warning(f"Agent not found: {agent_id}")
                    return False
                    
                agent = self._agents[agent_id]
                
                # Apply updates
                if 'name' in updates:
                    agent.name = updates['name']
                if 'skills' in updates:
                    agent.skills.update(updates['skills'])
                if 'capabilities' in updates:
                    agent.capabilities = updates['capabilities']
                if 'availability' in updates:
                    agent.availability = updates['availability']
                
                # Save updates
                await self._save_data()
                
                # Log update
                reflection_system.log_thought(
                    f"Updated agent {agent_id}",
                    {
                        'agent_id': agent_id,
                        'updates': updates
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error updating agent: {e}")
            return False
            
    async def get_agent(self, agent_id: str) -> Optional[AgentProfile]:
        """Get an agent's profile.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Optional[AgentProfile]: Agent profile if found
        """
        return self._agents.get(agent_id)
        
    async def list_agents(
        self,
        available_only: bool = False,
        skill_filter: Optional[Dict[str, float]] = None
    ) -> List[AgentProfile]:
        """List agents matching criteria.
        
        Args:
            available_only: Whether to list only available agents
            skill_filter: Filter by minimum skill levels
            
        Returns:
            List[AgentProfile]: Matching agents
        """
        agents = list(self._agents.values())
        
        # Filter by availability
        if available_only:
            agents = [a for a in agents if a.availability]
            
        # Filter by skills
        if skill_filter:
            filtered_agents = []
            for agent in agents:
                matches = True
                for skill, min_level in skill_filter.items():
                    if agent.skills.get(skill, 0) < min_level:
                        matches = False
                        break
                if matches:
                    filtered_agents.append(agent)
            agents = filtered_agents
            
        return agents
        
    async def remove_agent(self, agent_id: str) -> bool:
        """Remove an agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            bool: Whether removal was successful
        """
        try:
            async with self._lock:
                if agent_id not in self._agents:
                    logger.warning(f"Agent not found: {agent_id}")
                    return False
                    
                agent = self._agents[agent_id]
                
                # Check if agent is in a team
                if agent.current_team:
                    logger.warning(f"Cannot remove agent {agent_id} while in team {agent.current_team}")
                    return False
                
                # Remove agent
                del self._agents[agent_id]
                
                # Save updates
                await self._save_data()
                
                # Log removal
                reflection_system.log_thought(
                    f"Removed agent {agent_id}",
                    {
                        'agent_id': agent_id,
                        'name': agent.name
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error removing agent: {e}")
            return False
            
    async def get_team(self, team_id: str) -> Optional[TeamState]:
        """Get a team's state.
        
        Args:
            team_id: Team ID
            
        Returns:
            Optional[TeamState]: Team state if found
        """
        return self._teams.get(team_id)
        
    async def list_teams(
        self,
        status_filter: Optional[str] = None
    ) -> List[TeamState]:
        """List teams matching criteria.
        
        Args:
            status_filter: Filter by team status
            
        Returns:
            List[TeamState]: Matching teams
        """
        teams = list(self._teams.values())
        
        if status_filter:
            teams = [t for t in teams if t.status == status_filter]
            
        return teams
        
    async def get_team_analytics(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Get analytics for a team.
        
        Args:
            team_id: Team ID
            
        Returns:
            Optional[Dict[str, Any]]: Team analytics if found
        """
        try:
            team = self._teams.get(team_id)
            if not team:
                return None
                
            # Calculate team metrics
            metrics = {
                'performance': team.performance_metrics,
                'member_performance': {},
                'role_performance': {},
                'collaboration_score': 0.0,
                'success_rate': 0.0
            }
            
            # Calculate member performance
            for agent_id in team.members:
                agent = self._agents.get(agent_id)
                if agent:
                    metrics['member_performance'][agent_id] = {
                        'name': agent.name,
                        'skills': agent.skills,
                        'performance': agent.performance_history.get(team_id, {})
                    }
            
            # Calculate role performance
            for role, assignment in team.roles.items():
                agent_id = assignment.agent_id
                agent = self._agents.get(agent_id)
                if agent:
                    metrics['role_performance'][role] = {
                        'agent_id': agent_id,
                        'name': agent.name,
                        'performance': agent.performance_history.get(team_id, {})
                    }
            
            # Calculate collaboration score
            if metrics['member_performance']:
                collaboration_scores = []
                for perf in metrics['member_performance'].values():
                    if 'collaboration_score' in perf['performance']:
                        collaboration_scores.append(perf['performance']['collaboration_score'])
                if collaboration_scores:
                    metrics['collaboration_score'] = sum(collaboration_scores) / len(collaboration_scores)
            
            # Calculate success rate
            if metrics['performance']:
                success_count = sum(1 for m in metrics['performance'].values() if m.get('goal_success', 0) > 0)
                total_goals = len(metrics['performance'])
                if total_goals > 0:
                    metrics['success_rate'] = success_count / total_goals
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting team analytics: {e}")
            return None
            
    async def get_agent_analytics(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get analytics for an agent.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Optional[Dict[str, Any]]: Agent analytics if found
        """
        try:
            agent = self._agents.get(agent_id)
            if not agent:
                return None
                
            # Calculate agent metrics
            metrics = {
                'profile': {
                    'name': agent.name,
                    'skills': agent.skills,
                    'capabilities': agent.capabilities,
                    'availability': agent.availability,
                    'current_team': agent.current_team
                },
                'performance': {
                    'overall': {},
                    'by_team': {},
                    'by_role': {}
                },
                'skill_utilization': {},
                'success_rate': 0.0
            }
            
            # Calculate overall performance
            all_performance = []
            for team_perf in agent.performance_history.values():
                all_performance.extend(team_perf.values())
            
            if all_performance:
                metrics['performance']['overall'] = {
                    'avg_goal_success': sum(p.get('goal_success', 0) for p in all_performance) / len(all_performance),
                    'avg_completion_time': sum(p.get('completion_time', 0) for p in all_performance) / len(all_performance),
                    'avg_collaboration': sum(p.get('collaboration_score', 0) for p in all_performance) / len(all_performance)
                }
            
            # Calculate performance by team
            for team_id, team_perf in agent.performance_history.items():
                team = self._teams.get(team_id)
                if team:
                    metrics['performance']['by_team'][team_id] = {
                        'team_status': team.status,
                        'performance': team_perf
                    }
            
            # Calculate performance by role
            for team_id, team_perf in agent.performance_history.items():
                team = self._teams.get(team_id)
                if team:
                    for role, assignment in team.roles.items():
                        if assignment.agent_id == agent_id:
                            if role not in metrics['performance']['by_role']:
                                metrics['performance']['by_role'][role] = []
                            metrics['performance']['by_role'][role].extend(team_perf.values())
            
            # Calculate skill utilization
            for skill, level in agent.skills.items():
                utilization = 0
                count = 0
                for team_perf in agent.performance_history.values():
                    if 'skill_utilization' in team_perf:
                        if skill in team_perf['skill_utilization']:
                            utilization += team_perf['skill_utilization'][skill]
                            count += 1
                if count > 0:
                    metrics['skill_utilization'][skill] = utilization / count
            
            # Calculate success rate
            success_count = sum(1 for p in all_performance if p.get('goal_success', 0) > 0)
            if all_performance:
                metrics['success_rate'] = success_count / len(all_performance)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting agent analytics: {e}")
            return None
            
    async def get_system_analytics(self) -> Dict[str, Any]:
        """Get analytics for the entire system.
        
        Returns:
            Dict[str, Any]: System analytics
        """
        try:
            metrics = {
                'teams': {
                    'total': len(self._teams),
                    'active': len([t for t in self._teams.values() if t.status == 'active']),
                    'forming': len([t for t in self._teams.values() if t.status == 'forming']),
                    'disbanded': len([t for t in self._teams.values() if t.status == 'disbanded'])
                },
                'agents': {
                    'total': len(self._agents),
                    'available': len([a for a in self._agents.values() if a.availability]),
                    'in_teams': len([a for a in self._agents.values() if a.current_team])
                },
                'performance': {
                    'overall_success_rate': 0.0,
                    'avg_team_size': 0.0,
                    'skill_distribution': {},
                    'role_distribution': {}
                }
            }
            
            # Calculate overall success rate
            success_count = 0
            total_goals = 0
            for team in self._teams.values():
                for perf in team.performance_metrics.values():
                    if 'goal_success' in perf:
                        success_count += 1 if perf['goal_success'] > 0 else 0
                        total_goals += 1
            
            if total_goals > 0:
                metrics['performance']['overall_success_rate'] = success_count / total_goals
            
            # Calculate average team size
            active_teams = [t for t in self._teams.values() if t.status == 'active']
            if active_teams:
                metrics['performance']['avg_team_size'] = sum(len(t.members) for t in active_teams) / len(active_teams)
            
            # Calculate skill distribution
            for agent in self._agents.values():
                for skill, level in agent.skills.items():
                    if skill not in metrics['performance']['skill_distribution']:
                        metrics['performance']['skill_distribution'][skill] = []
                    metrics['performance']['skill_distribution'][skill].append(level)
            
            # Calculate role distribution
            for team in self._teams.values():
                for role in team.roles:
                    if role not in metrics['performance']['role_distribution']:
                        metrics['performance']['role_distribution'][role] = 0
                    metrics['performance']['role_distribution'][role] += 1
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting system analytics: {e}")
            return {}
            
    async def form_team_with_strategy(
        self,
        requirements: Dict[str, Any],
        strategy: str = 'balanced',
        role_requirements: Optional[Dict[str, Any]] = None
    ) -> Optional[TeamState]:
        """Form a team using a specific strategy.
        
        Args:
            requirements: Team formation requirements
            strategy: Formation strategy ('balanced', 'skill_based', 'diverse')
            role_requirements: Specific role requirements
            
        Returns:
            Optional[TeamState]: Formed team state or None if formation failed
        """
        try:
            async with self._lock:
                # Get available agents
                available_agents = [
                    agent for agent in self._agents.values()
                    if agent.availability and not agent.current_team
                ]
                
                if not available_agents:
                    logger.warning("No available agents for team formation")
                    return None
                
                # Filter agents by skill requirements
                qualified_agents = []
                for agent in available_agents:
                    qualified = True
                    for skill, min_level in self._skill_requirements.items():
                        if agent.skills.get(skill, 0) < min_level:
                            qualified = False
                            break
                    if qualified:
                        qualified_agents.append(agent)
                
                if not qualified_agents:
                    logger.warning("No agents meet skill requirements")
                    return None
                
                # Apply formation strategy
                if strategy == 'balanced':
                    team_members = self._balanced_formation(qualified_agents, requirements)
                elif strategy == 'skill_based':
                    team_members = self._skill_based_formation(qualified_agents, requirements)
                elif strategy == 'diverse':
                    team_members = self._diverse_formation(qualified_agents, requirements)
                else:
                    logger.warning(f"Unknown strategy: {strategy}")
                    return None
                
                if not team_members:
                    logger.warning("Strategy failed to form team")
                    return None
                
                # Create team
                team_id = f"team_{uuid.uuid4().hex[:8]}"
                role_assignments = {}
                
                # Assign roles if specified
                if role_requirements:
                    role_assignments = self._assign_roles(team_members, role_requirements)
                
                # Create team state
                team_state = TeamState(
                    team_id=team_id,
                    status='forming',
                    members=team_members,
                    roles=role_assignments
                )
                
                # Update agent states
                for agent_id in team_members:
                    self._agents[agent_id].current_team = team_id
                    self._agents[agent_id].availability = False
                
                # Save team
                self._teams[team_id] = team_state
                await self._save_data()
                
                # Log team formation
                reflection_system.log_thought(
                    f"Formed team {team_id} using {strategy} strategy",
                    {
                        'team_id': team_id,
                        'strategy': strategy,
                        'members': team_members,
                        'roles': role_assignments
                    }
                )
                
                return team_state
                
        except Exception as e:
            logger.error(f"Error forming team with strategy: {e}")
            return None
            
    def _balanced_formation(
        self,
        agents: List[AgentProfile],
        requirements: Dict[str, Any]
    ) -> List[str]:
        """Form a balanced team.
        
        Args:
            agents: Available agents
            requirements: Team requirements
            
        Returns:
            List[str]: Selected agent IDs
        """
        # Sort agents by overall skill score
        agents.sort(
            key=lambda x: sum(x.skills.values()),
            reverse=True
        )
        
        # Select agents to balance skills
        selected_agents = []
        min_team_size = requirements.get('min_team_size', 2)
        max_team_size = requirements.get('max_team_size', 5)
        
        # First, select agents with highest overall scores
        for agent in agents[:min_team_size]:
            selected_agents.append(agent.agent_id)
        
        # Then, fill remaining slots to balance skills
        if len(selected_agents) < max_team_size:
            remaining_agents = agents[min_team_size:]
            remaining_agents.sort(
                key=lambda x: self._calculate_skill_balance(x, selected_agents),
                reverse=True
            )
            selected_agents.extend(
                agent.agent_id for agent in remaining_agents
                if len(selected_agents) < max_team_size
            )
        
        return selected_agents
        
    def _skill_based_formation(
        self,
        agents: List[AgentProfile],
        requirements: Dict[str, Any]
    ) -> List[str]:
        """Form a team based on specific skills.
        
        Args:
            agents: Available agents
            requirements: Team requirements
            
        Returns:
            List[str]: Selected agent IDs
        """
        # Get required skills
        required_skills = set(self._skill_requirements.keys())
        
        # Sort agents by required skill coverage
        agents.sort(
            key=lambda x: sum(
                1 for skill in required_skills
                if x.skills.get(skill, 0) >= self._skill_requirements[skill]
            ),
            reverse=True
        )
        
        # Select agents with best skill coverage
        selected_agents = []
        min_team_size = requirements.get('min_team_size', 2)
        max_team_size = requirements.get('max_team_size', 5)
        
        for agent in agents:
            if len(selected_agents) >= max_team_size:
                break
                
            # Check if agent adds new skills
            current_skills = set()
            for agent_id in selected_agents:
                current_skills.update(
                    skill for skill, level in self._agents[agent_id].skills.items()
                    if level >= self._skill_requirements.get(skill, 0)
                )
            
            agent_skills = set(
                skill for skill, level in agent.skills.items()
                if level >= self._skill_requirements.get(skill, 0)
            )
            
            if agent_skills - current_skills or len(selected_agents) < min_team_size:
                selected_agents.append(agent.agent_id)
        
        return selected_agents
        
    def _diverse_formation(
        self,
        agents: List[AgentProfile],
        requirements: Dict[str, Any]
    ) -> List[str]:
        """Form a diverse team.
        
        Args:
            agents: Available agents
            requirements: Team requirements
            
        Returns:
            List[str]: Selected agent IDs
        """
        # Calculate agent diversity scores
        diversity_scores = {}
        for agent in agents:
            score = 0
            for other in agents:
                if other.agent_id != agent.agent_id:
                    # Calculate skill difference
                    skill_diff = sum(
                        abs(agent.skills.get(skill, 0) - other.skills.get(skill, 0))
                        for skill in set(agent.skills) | set(other.skills)
                    )
                    # Calculate capability difference
                    cap_diff = len(
                        set(agent.capabilities) ^ set(other.capabilities)
                    )
                    score += skill_diff + cap_diff
            diversity_scores[agent.agent_id] = score
        
        # Sort agents by diversity score
        agents.sort(
            key=lambda x: diversity_scores[x.agent_id],
            reverse=True
        )
        
        # Select diverse agents
        selected_agents = []
        min_team_size = requirements.get('min_team_size', 2)
        max_team_size = requirements.get('max_team_size', 5)
        
        for agent in agents:
            if len(selected_agents) >= max_team_size:
                break
                
            # Check if agent adds diversity
            if len(selected_agents) < min_team_size or self._is_diverse_addition(agent, selected_agents):
                selected_agents.append(agent.agent_id)
        
        return selected_agents
        
    def _calculate_skill_balance(
        self,
        agent: AgentProfile,
        selected_agents: List[str]
    ) -> float:
        """Calculate how well an agent balances the team's skills.
        
        Args:
            agent: Agent to evaluate
            selected_agents: Currently selected agent IDs
            
        Returns:
            float: Balance score
        """
        if not selected_agents:
            return 0.0
            
        # Calculate current team skill levels
        team_skills = {}
        for agent_id in selected_agents:
            for skill, level in self._agents[agent_id].skills.items():
                if skill not in team_skills:
                    team_skills[skill] = []
                team_skills[skill].append(level)
        
        # Calculate average skill levels
        avg_skills = {
            skill: sum(levels) / len(levels)
            for skill, levels in team_skills.items()
        }
        
        # Calculate how well agent balances skills
        balance_score = 0.0
        for skill, level in agent.skills.items():
            if skill in avg_skills:
                # Higher score for skills that are below average
                if level > avg_skills[skill]:
                    balance_score += 1.0
                else:
                    balance_score += level / avg_skills[skill]
            else:
                # Bonus for new skills
                balance_score += 1.0
        
        return balance_score
        
    def _is_diverse_addition(
        self,
        agent: AgentProfile,
        selected_agents: List[str]
    ) -> bool:
        """Check if an agent adds diversity to the team.
        
        Args:
            agent: Agent to evaluate
            selected_agents: Currently selected agent IDs
            
        Returns:
            bool: Whether agent adds diversity
        """
        if not selected_agents:
            return True
            
        # Calculate diversity threshold
        threshold = 0.3  # 30% difference required
        
        # Check skill diversity
        for agent_id in selected_agents:
            selected = self._agents[agent_id]
            skill_diff = sum(
                abs(agent.skills.get(skill, 0) - selected.skills.get(skill, 0))
                for skill in set(agent.skills) | set(selected.skills)
            )
            if skill_diff < threshold:
                return False
        
        # Check capability diversity
        for agent_id in selected_agents:
            selected = self._agents[agent_id]
            cap_diff = len(
                set(agent.capabilities) ^ set(selected.capabilities)
            )
            if cap_diff < 2:  # Require at least 2 different capabilities
                return False
        
        return True

    def _assign_roles(
        self,
        team_members: List[str],
        role_requirements: Dict[str, Any]
    ) -> Dict[str, RoleAssignment]:
        """Assign roles to team members.
        
        Args:
            team_members: List of agent IDs
            role_requirements: Specific role requirements
            
        Returns:
            Dict[str, RoleAssignment]: Assigned roles
        """
        role_assignments = {}
        for role, role_req in role_requirements.items():
            if role not in self._role_configs:
                logger.warning(f"Unknown role: {role}")
                continue
            
            # Find best agent for role
            best_agent = None
            best_score = 0
            
            for agent_id in team_members:
                if agent_id in role_assignments:
                    continue
                    
                # Calculate role fit score
                score = self._calculate_role_fit(self._agents[agent_id], role)
                if score > best_score:
                    best_score = score
                    best_agent = agent_id
            
            if best_agent:
                role_assignments[role] = RoleAssignment(
                    role=role,
                    agent_id=best_agent
                ) 