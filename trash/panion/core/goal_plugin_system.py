"""
Goal Plugin System
Handles dynamic capability expansion through plugin synthesis and skill analysis.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, field
import json
from pathlib import Path
import uuid

from panion_core.panion_plugins import PluginManager
from .plugin_synthesizer import PluginSynthesizer
from .skill_improvement_manager import SkillImprovementManager
from .meta_learning_agent import MetaLearningAgent

logger = logging.getLogger(__name__)

@dataclass
class CapabilityGap:
    """Identified capability gap."""
    name: str
    description: str
    required_skills: List[str]
    priority: float
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    discovered_at: datetime = field(default_factory=datetime.now)
    status: str = "identified"  # identified, composing, testing, registered, failed
    plugin_id: Optional[str] = None
    error: Optional[str] = None

@dataclass
class CapabilityProposal:
    """Agent-proposed capability upgrade."""
    agent_id: str
    name: str
    description: str
    benefits: List[str]
    required_skills: List[str]
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    proposed_at: datetime = field(default_factory=datetime.now)
    status: str = "proposed"  # proposed, approved, rejected, implemented
    feedback: Optional[str] = None

class GoalPluginSystem:
    """System for dynamic capability expansion through plugin synthesis."""
    
    def __init__(
        self,
        plugin_manager: PluginManager,
        plugin_synthesizer: PluginSynthesizer,
        skill_manager: SkillImprovementManager,
        meta_agent: MetaLearningAgent,
        data_dir: str = "data/capabilities"
    ):
        """Initialize the goal plugin system.
        
        Args:
            plugin_manager: Plugin manager instance
            plugin_synthesizer: Plugin synthesizer instance
            skill_manager: Skill improvement manager
            meta_agent: Meta-learning agent
            data_dir: Directory for storing capability data
        """
        self.plugin_manager = plugin_manager
        self.plugin_synthesizer = plugin_synthesizer
        self.skill_manager = skill_manager
        self.meta_agent = meta_agent
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.capability_gaps: Dict[str, CapabilityGap] = {}
        self.capability_proposals: Dict[str, CapabilityProposal] = {}
        self._load_state()
        
    def _load_state(self) -> None:
        """Load system state from .storage."""
        try:
            # Load capability gaps
            gaps_file = self.data_dir / "capability_gaps.json"
            if gaps_file.exists():
                with open(gaps_file, 'r') as f:
                    data = json.load(f)
                    self.capability_gaps = {
                        gap_id: CapabilityGap(**gap_data)
                        for gap_id, gap_data in data.items()
                    }
            
            # Load capability proposals
            proposals_file = self.data_dir / "capability_proposals.json"
            if proposals_file.exists():
                with open(proposals_file, 'r') as f:
                    data = json.load(f)
                    self.capability_proposals = {
                        prop_id: CapabilityProposal(**prop_data)
                        for prop_id, prop_data in data.items()
                    }
        except Exception as e:
            logger.error(f"Error loading state: {e}")
            
    def _save_state(self) -> None:
        """Save system state to storage."""
        try:
            # Save capability gaps
            gaps_file = self.data_dir / "capability_gaps.json"
            with open(gaps_file, 'w') as f:
                json.dump({
                    gap_id: {
                        "id": gap.id,
                        "name": gap.name,
                        "description": gap.description,
                        "required_skills": gap.required_skills,
                        "priority": gap.priority,
                        "discovered_at": gap.discovered_at.isoformat(),
                        "status": gap.status,
                        "plugin_id": gap.plugin_id,
                        "error": gap.error
                    }
                    for gap_id, gap in self.capability_gaps.items()
                }, f, indent=2)
            
            # Save capability proposals
            proposals_file = self.data_dir / "capability_proposals.json"
            with open(proposals_file, 'w') as f:
                json.dump({
                    prop_id: {
                        "id": prop.id,
                        "agent_id": prop.agent_id,
                        "name": prop.name,
                        "description": prop.description,
                        "benefits": prop.benefits,
                        "required_skills": prop.required_skills,
                        "proposed_at": prop.proposed_at.isoformat(),
                        "status": prop.status,
                        "feedback": prop.feedback
                    }
                    for prop_id, prop in self.capability_proposals.items()
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving state: {e}")
            
    async def identify_capability_gaps(self, agent_id: str) -> List[CapabilityGap]:
        """Identify capability gaps for an agent.
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            List of identified capability gaps
        """
        # Get agent's current skills
        current_skills = self.skill_manager.get_agent_skills(agent_id)
        
        # Analyze skill weaknesses
        weaknesses = self.skill_manager.analyze_skill_weaknesses(agent_id)
        
        # Identify gaps
        gaps = []
        for weakness in weaknesses:
            if weakness not in current_skills or current_skills[weakness] < 0.7:
                gap = CapabilityGap(
                    name=f"{weakness}_capability",
                    description=f"Capability for {weakness}",
                    required_skills=[weakness],
                    priority=1.0 - (current_skills.get(weakness, 0.0))
                )
                self.capability_gaps[gap.id] = gap
                gaps.append(gap)
                
        self._save_state()
        return gaps
        
    async def propose_capability_upgrade(
        self,
        agent_id: str,
        name: str,
        description: str,
        benefits: List[str],
        required_skills: List[str]
    ) -> CapabilityProposal:
        """Propose a new capability upgrade.
        
        Args:
            agent_id: ID of the proposing agent
            name: Name of the capability
            description: Description of the capability
            benefits: List of expected benefits
            required_skills: Required skills for the capability
            
        Returns:
            Created capability proposal
        """
        proposal = CapabilityProposal(
            agent_id=agent_id,
            name=name,
            description=description,
            benefits=benefits,
            required_skills=required_skills
        )
        
        self.capability_proposals[proposal.id] = proposal
        self._save_state()
        
        logger.info(f"Agent {agent_id} proposed capability upgrade: {name}")
        return proposal
        
    async def process_capability_gap(self, gap_id: str) -> Dict[str, Any]:
        """Process a capability gap by creating and testing a plugin.
        
        Args:
            gap_id: ID of the capability gap
            
        Returns:
            Processing results
        """
        gap = self.capability_gaps.get(gap_id)
        if not gap:
            raise ValueError(f"Capability gap {gap_id} not found")
            
        results = {
            "gap_id": gap_id,
            "steps": [],
            "status": "started"
        }
        
        try:
            # 1. Compose plugin
            gap.status = "composing"
            plugin_id = await self._compose_plugin(gap)
            results["steps"].append({
                "action": "compose_plugin",
                "status": "completed",
                "plugin_id": plugin_id,
                "timestamp": datetime.now().isoformat()
            })
            
            # 2. Test plugin
            gap.status = "testing"
            test_results = await self._test_plugin(plugin_id)
            results["steps"].append({
                "action": "test_plugin",
                "status": "completed",
                "results": test_results,
                "timestamp": datetime.now().isoformat()
            })
            
            # 3. Register capability
            gap.status = "registered"
            gap.plugin_id = plugin_id
            results["steps"].append({
                "action": "register_capability",
                "status": "completed",
                "timestamp": datetime.now().isoformat()
            })
            
            results["status"] = "completed"
            
        except Exception as e:
            gap.status = "failed"
            gap.error = str(e)
            results["status"] = "failed"
            results["error"] = str(e)
            
        self._save_state()
        return results
        
    async def _compose_plugin(self, gap: CapabilityGap) -> str:
        """Compose a plugin for a capability gap.
        
        Args:
            gap: Capability gap to address
            
        Returns:
            ID of the created plugin
        """
        # Create plugin from .template
        plugin_id = await self.plugin_synthesizer.create_plugin(
            template_id="capability_template",
            plugin_name=gap.name,
            plugin_description=gap.description,
            additional_capabilities=gap.required_skills
        )
        
        if not plugin_id:
            raise ValueError("Failed to create plugin")
            
        return plugin_id
        
    async def _test_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """Test a newly created plugin.
        
        Args:
            plugin_id: ID of the plugin to test
            
        Returns:
            Test results
        """
        # Verify plugin integrity
        verification = await self.plugin_manager.verify_plugin(plugin_id)
        if not verification["checks"]["files_integrity"]:
            raise ValueError("Plugin verification failed")
            
        # Test plugin functionality
        test_results = await self.plugin_manager.execute_plugin(plugin_id, "test")
        if not test_results.get("success", False):
            raise ValueError("Plugin testing failed")
            
        return test_results
        
    def get_capability_status(self) -> Dict[str, Any]:
        """Get current capability status.
        
        Returns:
            Status information
        """
        return {
            "gaps": {
                gap_id: {
                    "name": gap.name,
                    "status": gap.status,
                    "priority": gap.priority
                }
                for gap_id, gap in self.capability_gaps.items()
            },
            "proposals": {
                prop_id: {
                    "name": prop.name,
                    "status": prop.status,
                    "agent_id": prop.agent_id
                }
                for prop_id, prop in self.capability_proposals.items()
            }
        } 