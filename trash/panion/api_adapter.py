"""
Panion API Adapter
Exposes Panion functionality via HTTP endpoints for integration with the frontend.
Includes chat capability for natural language interaction.
"""

import os
import sys
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel

# Add current directory to path so we can import the modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Panion core functionality (directly without the panion. prefix)
# We'll use mocks/simplified versions for these imports since we're focusing on 
# the chat interface integration
#from main_panion import initialize_system
#from api.panion_api import PanionAPI
#from core.base import ComponentState
#from core.team_formation_manager import TeamFormationManager, AgentProfile
#from test_team_formation import create_test_agents

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize the FastAPI app
app = FastAPI(title="Panion API Adapter", description="Adapter for Panion functionality")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Panion API for the chat integration
class MockPanionAPI:
    def __init__(self):
        self.start_time = datetime.now()
        self.is_monitoring = False
        
    def start_monitoring(self):
        self.is_monitoring = True
        logger.info("Started monitoring with MockPanionAPI")
        
    def stop_monitoring(self):
        self.is_monitoring = False
        logger.info("Stopped monitoring with MockPanionAPI")
    
    async def stop(self):
        self.is_monitoring = False
        logger.info("Stopped MockPanionAPI")
        
    def get_uptime_stats(self):
        return {
            "start_time": self.start_time,
            "total_uptime": (datetime.now() - self.start_time).total_seconds(),
            "performance_metrics": {
                "memory_usage_mb": 128,
                "cpu_percent": 15.5,
                "requests_handled": 42
            }
        }

# Mock AgentProfile class for the agents endpoint
class MockAgentProfile:
    def __init__(self, id, name, skills, capabilities, availability=True, current_team=None, performance_metrics=None):
        self.id = id
        self.name = name
        self.skills = skills
        self.capabilities = capabilities
        self.availability = availability
        self.current_team = current_team
        self.performance_metrics = performance_metrics or {"success_rate": 0.9}

# Initialize the Panion API with our mock version
panion_api = MockPanionAPI()
panion_system_initialized = False

# Pydantic models for API request/response validation
class AgentProfileModel(BaseModel):
    id: str
    name: str
    skills: Dict[str, float]
    capabilities: List[str]
    availability: bool
    current_team: Optional[str] = None
    performance_metrics: Dict[str, float]

class UptimeStats(BaseModel):
    start_time: str
    uptime_seconds: float
    status: str
    performance_metrics: Dict[str, Any]

class GoalRequest(BaseModel):
    goal_description: str
    priority: str = "medium"
    deadline: Optional[str] = None
    required_capabilities: List[str] = []
    
class ChatMessage(BaseModel):
    content: str
    sessionId: str = "default"
    
class ChatResponse(BaseModel):
    response: str
    thinking: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None

# Mock function to simulate creating test agents
async def mock_create_test_agents() -> Dict[str, MockAgentProfile]:
    """Create test agent profiles."""
    return {
        "agent1": MockAgentProfile(
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
        "agent2": MockAgentProfile(
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
        "agent3": MockAgentProfile(
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

# Startup event to initialize the Panion system
@app.on_event("startup")
async def startup_event():
    global panion_system_initialized
    try:
        logger.info("Initializing Panion system...")
        # Start the Panion API
        panion_api.start_monitoring()
        panion_system_initialized = True
        logger.info("Panion system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Panion system: {str(e)}")
        raise

# Shutdown event to clean up resources
@app.on_event("shutdown")
async def shutdown_event():
    try:
        logger.info("Shutting down Panion system...")
        panion_api.stop_monitoring()
        await panion_api.stop()
        logger.info("Panion system shut down successfully")
    except Exception as e:
        logger.error(f"Error shutting down Panion system: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    if not panion_system_initialized:
        raise HTTPException(status_code=503, detail="Panion system not initialized")
    return {"status": "ok", "initialized": panion_system_initialized}

# Get uptime statistics
@app.get("/uptime", response_model=UptimeStats)
async def get_uptime():
    try:
        stats = panion_api.get_uptime_stats()
        return {
            "start_time": stats["start_time"].isoformat(),
            "uptime_seconds": stats["total_uptime"],
            "status": "active" if panion_system_initialized else "inactive",
            "performance_metrics": stats["performance_metrics"]
        }
    except Exception as e:
        logger.error(f"Error getting uptime stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting uptime stats: {str(e)}")

# Get available agents
@app.get("/agents", response_model=List[AgentProfileModel])
async def get_agents():
    try:
        # For initial implementation, use mock test agents
        agents = await mock_create_test_agents()
        return [
            AgentProfileModel(
                id=agent.id,
                name=agent.name,
                skills=agent.skills,
                capabilities=agent.capabilities,
                availability=agent.availability,
                current_team=agent.current_team,
                performance_metrics=agent.performance_metrics
            )
            for agent in agents.values()
        ]
    except Exception as e:
        logger.error(f"Error getting agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting agents: {str(e)}")

# Submit a new goal to the Panion system
@app.post("/goals")
async def create_goal(goal: GoalRequest = Body(...)):
    try:
        logger.info(f"Creating new goal: {goal.goal_description}")
        # This is a simplified placeholder - in a real implementation,
        # this would connect to the goal processing system
        goal_id = f"goal_{hash(goal.goal_description) % 10000}"
        
        return {
            "goal_id": goal_id,
            "status": "submitted",
            "message": "Goal submitted successfully"
        }
    except Exception as e:
        logger.error(f"Error creating goal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating goal: {str(e)}")

# Get system stats
@app.get("/system/stats")
async def get_system_stats():
    try:
        return {
            "status": "active" if panion_system_initialized else "inactive",
            "agent_count": 3,  # Simplified for initial implementation
            "plugin_count": 5,  # Simplified for initial implementation
            "memory_usage": {
                "total_mb": 256,  # Placeholder
                "used_mb": 128    # Placeholder
            },
            "cpu_usage": 25.5,    # Placeholder
            "uptime_hours": 2.5   # Placeholder
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting system stats: {str(e)}")

# Chat endpoint for natural language interaction
@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage = Body(...)):
    try:
        logger.info(f"Received chat message: {message.content}")
        
        # Store conversation by session ID
        session_id = message.sessionId
        
        # This is a simplified implementation for the chat functionality
        # In a real implementation, this would connect to your LLM or custom processing logic
        
        # Example responses based on message content
        if "hello" in message.content.lower() or "hi" in message.content.lower():
            response = "Hello! I'm your Panion assistant. How can I help you today?"
        elif "help" in message.content.lower():
            response = "I can help with various tasks like:\n- Creating and monitoring goals\n- Managing agent teams\n- Providing system analytics\n- Answering questions about the Panion system"
        elif "goal" in message.content.lower() or "task" in message.content.lower():
            response = "I can help you create a new goal or task. Would you like me to help you define the requirements and assign it to the most suitable agents?"
        elif "agent" in message.content.lower() or "team" in message.content.lower():
            response = "We have several agents with different capabilities. I can help you form a team for a specific task or show you the available agents."
        elif "stat" in message.content.lower() or "system" in message.content.lower():
            stats = await get_system_stats()
            response = f"The system is currently {stats['status']}. We have {stats['agent_count']} agents and {stats['plugin_count']} plugins available."
        else:
            # Default response for other types of messages
            response = f"I understand that you're asking about '{message.content}'. Let me analyze this and find the best way to help you with this request."
        
        # Return the response with additional metadata
        return ChatResponse(
            response=response,
            thinking=f"Analyzing input: '{message.content}'",
            additional_info={
                "timestamp": datetime.now().isoformat(),
                "session_id": session_id,
                "intent_detected": detect_intent(message.content),
                "confidence": 0.85  # Example confidence score
            }
        )
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat message: {str(e)}")

# Simple intent detection function (placeholder for a more sophisticated implementation)
def detect_intent(message: str) -> str:
    """Detect the intent of a message."""
    message = message.lower()
    
    if any(word in message for word in ["hello", "hi", "hey", "greetings"]):
        return "greeting"
    elif any(word in message for word in ["help", "support", "assist"]):
        return "help_request"
    elif any(word in message for word in ["goal", "task", "objective", "project"]):
        return "goal_creation"
    elif any(word in message for word in ["agent", "team", "group", "collaborate"]):
        return "agent_management"
    elif any(word in message for word in ["status", "stat", "performance", "health", "system"]):
        return "system_status"
    else:
        return "general_query"

# Run the API server when script is executed directly
if __name__ == "__main__":
    port = int(os.environ.get("PANION_API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)