"""
API adapter for Agent Collaboration System.
Provides HTTP endpoints to access collaboration functionality.
"""

import os
import json
import logging
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler
from enum import Enum

from .agent_collaboration import (
    AgentCollaborationSystem, 
    CollaborationMessageType,
    CollaborationPriority,
    AgentTeamCoordinator,
    request_task,
    share_knowledge
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize collaboration system and team coordinator
collaboration_system = AgentCollaborationSystem()
team_coordinator = AgentTeamCoordinator(collaboration_system)

class CollaborationAPIHandler:
    """Handler for collaboration API requests"""
    
    @staticmethod
    def handle_request(handler: BaseHTTPRequestHandler, path: str, method: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle an API request to the collaboration system.
        
        Args:
            handler: The HTTP request handler
            path: The request path
            method: The HTTP method
            data: The request data
            
        Returns:
            Response data as a dictionary
        """
        try:
            # Agent registration
            if path == "/agents/register" and method == "POST":
                return CollaborationAPIHandler._register_agent(data)
            
            # Agent unregistration
            elif path == "/agents/unregister" and method == "POST":
                return CollaborationAPIHandler._unregister_agent(data)
            
            # Get agent list
            elif path == "/agents" and method == "GET":
                return CollaborationAPIHandler._get_agents()
            
            # Get agent capabilities
            elif path.startswith("/agents/capabilities") and method == "GET":
                capability = path.split("/")[-1] if len(path.split("/")) > 3 else None
                return CollaborationAPIHandler._get_agents_with_capability(capability)
            
            # Send message
            elif path == "/messages/send" and method == "POST":
                return CollaborationAPIHandler._send_message(data)
            
            # Get messages for agent
            elif path.startswith("/messages/agent/") and method == "GET":
                agent_id = path.split("/")[-1]
                return CollaborationAPIHandler._get_agent_messages(agent_id)
            
            # Process message
            elif path == "/messages/process" and method == "POST":
                return CollaborationAPIHandler._process_message(data)
            
            # Add knowledge
            elif path == "/knowledge/add" and method == "POST":
                return CollaborationAPIHandler._add_knowledge(data)
            
            # Get knowledge
            elif path.startswith("/knowledge/item/") and method == "GET":
                item_id = path.split("/")[-1]
                return CollaborationAPIHandler._get_knowledge(item_id)
            
            # Search knowledge
            elif path == "/knowledge/search" and method == "POST":
                return CollaborationAPIHandler._search_knowledge(data)
            
            # Update knowledge
            elif path == "/knowledge/update" and method == "POST":
                return CollaborationAPIHandler._update_knowledge(data)
            
            # Create team
            elif path == "/teams/create" and method == "POST":
                return CollaborationAPIHandler._create_team(data)
            
            # Add team member
            elif path == "/teams/members/add" and method == "POST":
                return CollaborationAPIHandler._add_team_member(data)
            
            # Remove team member
            elif path == "/teams/members/remove" and method == "POST":
                return CollaborationAPIHandler._remove_team_member(data)
            
            # Get agent teams
            elif path.startswith("/teams/agent/") and method == "GET":
                agent_id = path.split("/")[-1]
                return CollaborationAPIHandler._get_agent_teams(agent_id)
            
            # Broadcast to team
            elif path == "/teams/broadcast" and method == "POST":
                return CollaborationAPIHandler._broadcast_to_team(data)
            
            # Assign team task
            elif path == "/teams/assign-task" and method == "POST":
                return CollaborationAPIHandler._assign_team_task(data)
            
            # Update task status
            elif path == "/teams/update-task-status" and method == "POST":
                return CollaborationAPIHandler._update_task_status(data)
            
            # Disband team
            elif path == "/teams/disband" and method == "POST":
                return CollaborationAPIHandler._disband_team(data)
            
            else:
                return {
                    "error": "Not found",
                    "message": f"Endpoint {path} not found"
                }
                
        except Exception as e:
            logger.error(f"Error handling collaboration API request: {str(e)}")
            return {
                "error": "Internal server error",
                "message": str(e)
            }
    
    @staticmethod
    def _register_agent(data: Dict[str, Any]) -> Dict[str, Any]:
        """Register an agent with the collaboration system."""
        agent_id = data.get("agent_id")
        agent_name = data.get("agent_name")
        capabilities = data.get("capabilities", [])
        
        if not agent_id or not agent_name:
            return {
                "error": "Bad request",
                "message": "agent_id and agent_name are required"
            }
        
        success = collaboration_system.register_agent(
            agent_id=agent_id,
            agent_name=agent_name,
            capabilities=capabilities
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Agent {agent_name} registered successfully",
                "agent_id": agent_id
            }
        else:
            return {
                "error": "Registration failed",
                "message": f"Agent {agent_id} is already registered"
            }
    
    @staticmethod
    def _unregister_agent(data: Dict[str, Any]) -> Dict[str, Any]:
        """Unregister an agent from the collaboration system."""
        agent_id = data.get("agent_id")
        
        if not agent_id:
            return {
                "error": "Bad request",
                "message": "agent_id is required"
            }
        
        success = collaboration_system.unregister_agent(agent_id)
        
        if success:
            return {
                "status": "success",
                "message": f"Agent {agent_id} unregistered successfully"
            }
        else:
            return {
                "error": "Unregistration failed",
                "message": f"Agent {agent_id} is not registered"
            }
    
    @staticmethod
    def _get_agents() -> Dict[str, Any]:
        """Get a list of all registered agents."""
        agents = [agent for agent in collaboration_system.agents.values()]
        
        return {
            "status": "success",
            "agents": agents
        }
    
    @staticmethod
    def _get_agents_with_capability(capability: Optional[str]) -> Dict[str, Any]:
        """Get a list of agents with a specific capability."""
        if not capability:
            return {
                "error": "Bad request",
                "message": "capability is required"
            }
        
        agents = collaboration_system.find_agents_with_capability(capability)
        
        return {
            "status": "success",
            "capability": capability,
            "agents": agents
        }
    
    @staticmethod
    def _send_message(data: Dict[str, Any]) -> Dict[str, Any]:
        """Send a message from one agent to another."""
        sender_id = data.get("sender_id")
        receiver_id = data.get("receiver_id")
        message_type = data.get("message_type")
        content = data.get("content", {})
        priority = data.get("priority", "medium")
        reference_id = data.get("reference_id")
        expires_at = None
        
        if data.get("expires_in_hours"):
            expires_at = datetime.now() + timedelta(hours=float(data["expires_in_hours"]))
        
        if not sender_id or not receiver_id or not message_type:
            return {
                "error": "Bad request",
                "message": "sender_id, receiver_id, and message_type are required"
            }
        
        try:
            message_id = collaboration_system.send_message(
                sender_id=sender_id,
                receiver_id=receiver_id,
                message_type=message_type,
                content=content,
                priority=priority,
                reference_id=reference_id,
                expires_at=expires_at
            )
            
            return {
                "status": "success",
                "message": "Message sent successfully",
                "message_id": message_id
            }
        except ValueError as e:
            return {
                "error": "Invalid request",
                "message": str(e)
            }
    
    @staticmethod
    def _get_agent_messages(agent_id: str) -> Dict[str, Any]:
        """Get messages for an agent."""
        if not agent_id:
            return {
                "error": "Bad request",
                "message": "agent_id is required"
            }
        
        try:
            messages = collaboration_system.get_agent_messages(agent_id)
            
            return {
                "status": "success",
                "agent_id": agent_id,
                "messages": messages
            }
        except ValueError as e:
            return {
                "error": "Invalid request",
                "message": str(e)
            }
    
    @staticmethod
    def _process_message(data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a message."""
        message_id = data.get("message_id")
        response_content = data.get("response_content")
        
        if not message_id:
            return {
                "error": "Bad request",
                "message": "message_id is required"
            }
        
        try:
            response_id = collaboration_system.process_message(
                message_id=message_id,
                response_content=response_content
            )
            
            return {
                "status": "success",
                "message": "Message processed successfully",
                "response_id": response_id
            }
        except ValueError as e:
            return {
                "error": "Invalid request",
                "message": str(e)
            }
    
    @staticmethod
    def _add_knowledge(data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a knowledge item."""
        agent_id = data.get("agent_id")
        content = data.get("content", {})
        category = data.get("category")
        confidence = data.get("confidence", 1.0)
        tags = data.get("tags", [])
        expires_at = None
        
        if data.get("expires_in_hours"):
            expires_at = datetime.now() + timedelta(hours=float(data["expires_in_hours"]))
        
        if not agent_id or not category:
            return {
                "error": "Bad request",
                "message": "agent_id and category are required"
            }
        
        try:
            item_id = collaboration_system.add_knowledge(
                agent_id=agent_id,
                content=content,
                category=category,
                confidence=confidence,
                tags=tags,
                expires_at=expires_at
            )
            
            return {
                "status": "success",
                "message": "Knowledge added successfully",
                "item_id": item_id
            }
        except ValueError as e:
            return {
                "error": "Invalid request",
                "message": str(e)
            }
    
    @staticmethod
    def _get_knowledge(item_id: str) -> Dict[str, Any]:
        """Get a knowledge item."""
        if not item_id:
            return {
                "error": "Bad request",
                "message": "item_id is required"
            }
        
        item = collaboration_system.get_knowledge(item_id)
        
        if item:
            return {
                "status": "success",
                "item": item
            }
        else:
            return {
                "error": "Not found",
                "message": f"Knowledge item {item_id} not found"
            }
    
    @staticmethod
    def _search_knowledge(data: Dict[str, Any]) -> Dict[str, Any]:
        """Search the knowledge base."""
        query = data.get("query")
        category = data.get("category")
        tags = data.get("tags", [])
        min_confidence = data.get("min_confidence", 0.0)
        
        results = collaboration_system.search_knowledge(
            query=query,
            category=category,
            tags=tags,
            min_confidence=min_confidence
        )
        
        return {
            "status": "success",
            "results": results
        }
    
    @staticmethod
    def _update_knowledge(data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a knowledge item."""
        item_id = data.get("item_id")
        content = data.get("content", {})
        confidence = data.get("confidence")
        
        if not item_id:
            return {
                "error": "Bad request",
                "message": "item_id is required"
            }
        
        success = collaboration_system.update_knowledge(
            item_id=item_id,
            content=content,
            confidence=confidence
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Knowledge item {item_id} updated successfully"
            }
        else:
            return {
                "error": "Update failed",
                "message": f"Knowledge item {item_id} not found"
            }
    
    @staticmethod
    def _create_team(data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new team."""
        team_id = data.get("team_id", str(uuid.uuid4()))
        name = data.get("name")
        description = data.get("description", "")
        coordinator_id = data.get("coordinator_id")
        
        if not name:
            return {
                "error": "Bad request",
                "message": "name is required"
            }
        
        success = team_coordinator.create_team(
            team_id=team_id,
            name=name,
            description=description,
            coordinator_id=coordinator_id
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Team {name} created successfully",
                "team_id": team_id
            }
        else:
            return {
                "error": "Creation failed",
                "message": f"Team {team_id} already exists"
            }
    
    @staticmethod
    def _add_team_member(data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a member to a team."""
        team_id = data.get("team_id")
        agent_id = data.get("agent_id")
        role = data.get("role", "member")
        
        if not team_id or not agent_id:
            return {
                "error": "Bad request",
                "message": "team_id and agent_id are required"
            }
        
        success = team_coordinator.add_team_member(
            team_id=team_id,
            agent_id=agent_id,
            role=role
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Agent {agent_id} added to team {team_id} successfully"
            }
        else:
            return {
                "error": "Addition failed",
                "message": f"Failed to add agent {agent_id} to team {team_id}"
            }
    
    @staticmethod
    def _remove_team_member(data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove a member from a team."""
        team_id = data.get("team_id")
        agent_id = data.get("agent_id")
        
        if not team_id or not agent_id:
            return {
                "error": "Bad request",
                "message": "team_id and agent_id are required"
            }
        
        success = team_coordinator.remove_team_member(
            team_id=team_id,
            agent_id=agent_id
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Agent {agent_id} removed from team {team_id} successfully"
            }
        else:
            return {
                "error": "Removal failed",
                "message": f"Failed to remove agent {agent_id} from team {team_id}"
            }
    
    @staticmethod
    def _get_agent_teams(agent_id: str) -> Dict[str, Any]:
        """Get all teams an agent is a member of."""
        if not agent_id:
            return {
                "error": "Bad request",
                "message": "agent_id is required"
            }
        
        teams = team_coordinator.get_agent_teams(agent_id)
        
        return {
            "status": "success",
            "agent_id": agent_id,
            "teams": teams
        }
    
    @staticmethod
    def _broadcast_to_team(data: Dict[str, Any]) -> Dict[str, Any]:
        """Broadcast a message to all members of a team."""
        team_id = data.get("team_id")
        sender_id = data.get("sender_id")
        message_type = data.get("message_type")
        content = data.get("content", {})
        priority = data.get("priority", "medium")
        exclude_agents = data.get("exclude_agents", [])
        
        if not team_id or not sender_id or not message_type:
            return {
                "error": "Bad request",
                "message": "team_id, sender_id, and message_type are required"
            }
        
        try:
            message_ids = team_coordinator.broadcast_to_team(
                team_id=team_id,
                sender_id=sender_id,
                message_type=CollaborationMessageType(message_type),
                content=content,
                priority=CollaborationPriority(priority) if isinstance(priority, str) else priority,
                exclude_agents=exclude_agents
            )
            
            return {
                "status": "success",
                "message": "Message broadcast successfully",
                "message_ids": message_ids
            }
        except (ValueError, KeyError) as e:
            return {
                "error": "Invalid request",
                "message": str(e)
            }
    
    @staticmethod
    def _assign_team_task(data: Dict[str, Any]) -> Dict[str, Any]:
        """Assign a task to multiple members of a team."""
        team_id = data.get("team_id")
        coordinator_id = data.get("coordinator_id")
        task_type = data.get("task_type")
        task_data = data.get("task_data", {})
        assignments = data.get("assignments", {})
        priority = data.get("priority", "medium")
        deadline = None
        
        if data.get("deadline_hours"):
            deadline = datetime.now() + timedelta(hours=float(data["deadline_hours"]))
        
        if not team_id or not coordinator_id or not task_type or not assignments:
            return {
                "error": "Bad request",
                "message": "team_id, coordinator_id, task_type, and assignments are required"
            }
        
        try:
            message_ids = team_coordinator.assign_team_task(
                team_id=team_id,
                coordinator_id=coordinator_id,
                task_type=task_type,
                task_data=task_data,
                assignments=assignments,
                priority=CollaborationPriority(priority) if isinstance(priority, str) else priority,
                deadline=deadline
            )
            
            return {
                "status": "success",
                "message": "Task assigned successfully",
                "message_ids": message_ids
            }
        except (ValueError, KeyError) as e:
            return {
                "error": "Invalid request",
                "message": str(e)
            }
    
    @staticmethod
    def _update_task_status(data: Dict[str, Any]) -> Dict[str, Any]:
        """Update the status of a team task."""
        team_id = data.get("team_id")
        task_id = data.get("task_id")
        status = data.get("status")
        
        if not team_id or not task_id or not status:
            return {
                "error": "Bad request",
                "message": "team_id, task_id, and status are required"
            }
        
        success = team_coordinator.update_task_status(
            team_id=team_id,
            task_id=task_id,
            status=status
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Task {task_id} status updated to {status} successfully"
            }
        else:
            return {
                "error": "Update failed",
                "message": f"Failed to update task {task_id} status"
            }
    
    @staticmethod
    def _disband_team(data: Dict[str, Any]) -> Dict[str, Any]:
        """Disband a team."""
        team_id = data.get("team_id")
        notify_members = data.get("notify_members", True)
        
        if not team_id:
            return {
                "error": "Bad request",
                "message": "team_id is required"
            }
        
        success = team_coordinator.disband_team(
            team_id=team_id,
            notify_members=notify_members
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Team {team_id} disbanded successfully"
            }
        else:
            return {
                "error": "Disband failed",
                "message": f"Failed to disband team {team_id}"
            }