"""
Panion API Adapter
Exposes Panion functionality via HTTP endpoints for integration with the frontend.
Includes chat capability for natural language interaction.
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel

# Import Panion core functionality
from panion.main_panion import initialize_system
from panion.api.panion_api import PanionAPI
from panion.core.base import ComponentState
from panion.core.team_formation_manager import TeamFormationManager, AgentProfile
from panion.test_team_formation import create_test_agents

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

# Initialize the Panion API
panion_api = PanionAPI()
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

# Startup event to initialize the Panion system
@app.on_event("startup")
async def startup_event():
    global panion_system_initialized
    try:
        logger.info("Initializing Panion system...")
        # Initialize Panion system
        await initialize_system()
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
        # For initial implementation, use test agents from test_team_formation.py
        agents = await create_test_agents()
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

# Run the API server when script is executed directly
if __name__ == "__main__":
    port = int(os.environ.get("PANION_API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)