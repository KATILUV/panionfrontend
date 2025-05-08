"""
Agent Management System
Coordinates multi-agent teams and manages the lifecycle of specialized agents.
"""

import os
import json
import logging
import uuid
import time
import threading
from typing import List, Dict, Any, Optional, Union, Callable
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AgentStatus(Enum):
    """Status of an agent in the system."""
    INITIALIZING = "initializing"
    READY = "ready"
    BUSY = "busy"
    PAUSED = "paused"
    OFFLINE = "offline"
    ERROR = "error"

class AgentType(Enum):
    """Types of agents in the system."""
    RESEARCH = "research"
    CODING = "coding"
    DESIGN = "design"
    WRITING = "writing"
    DATA_ANALYSIS = "data_analysis"
    PLANNING = "planning"
    DECISION = "decision"
    CREATIVE = "creative"
    COMMUNICATION = "communication"
    VIDEO = "video"
    IMAGE = "image"
    WEB_SCRAPING = "web_scraping"
    DOCUMENT_PROCESSING = "document_processing"
    TASK_AUTOMATION = "task_automation"
    CUSTOM = "custom"

class Agent:
    """Base class for all agents in the system."""
    
    def __init__(self, 
                agent_id: str,
                name: str,
                agent_type: AgentType,
                description: str = "",
                capabilities: List[str] = None,
                skills: Dict[str, float] = None,
                metadata: Dict[str, Any] = None):
        """
        Initialize an agent.
        
        Args:
            agent_id: Unique identifier for the agent
            name: Display name of the agent
            agent_type: Type of agent
            description: Detailed description of the agent
            capabilities: List of capabilities this agent provides
            skills: Dictionary mapping skill names to proficiency levels (0.0-1.0)
            metadata: Additional metadata for the agent
        """
        self.agent_id = agent_id
        self.name = name
        self.agent_type = agent_type
        self.description = description
        self.capabilities = capabilities or []
        self.skills = skills or {}
        self.metadata = metadata or {}
        
        # Runtime attributes
        self.status = AgentStatus.INITIALIZING
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.last_active = None
        self.current_task = None
        self.performance_metrics = {
            "tasks_completed": 0,
            "success_rate": 0.0,
            "average_response_time": 0.0,
            "total_runtime": 0.0
        }
        self.error_count = 0
        self.error_message = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to a dictionary for serialization."""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "agent_type": self.agent_type.value,
            "description": self.description,
            "capabilities": self.capabilities,
            "skills": self.skills,
            "metadata": self.metadata,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_active": self.last_active.isoformat() if self.last_active else None,
            "current_task": self.current_task,
            "performance_metrics": self.performance_metrics,
            "error_count": self.error_count,
            "error_message": self.error_message
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Agent':
        """Create an Agent instance from a dictionary."""
        agent = cls(
            agent_id=data["agent_id"],
            name=data["name"],
            agent_type=AgentType(data["agent_type"]),
            description=data.get("description", ""),
            capabilities=data.get("capabilities", []),
            skills=data.get("skills", {}),
            metadata=data.get("metadata", {})
        )
        
        # Set runtime attributes
        agent.status = AgentStatus(data["status"])
        agent.created_at = datetime.fromisoformat(data["created_at"])
        agent.updated_at = datetime.fromisoformat(data["updated_at"])
        agent.last_active = datetime.fromisoformat(data["last_active"]) if data.get("last_active") else None
        agent.current_task = data.get("current_task")
        agent.performance_metrics = data.get("performance_metrics", {})
        agent.error_count = data.get("error_count", 0)
        agent.error_message = data.get("error_message")
        
        return agent
    
    def start(self) -> bool:
        """Start the agent. To be implemented by subclasses."""
        self.status = AgentStatus.READY
        self.updated_at = datetime.now()
        return True
    
    def stop(self) -> bool:
        """Stop the agent. To be implemented by subclasses."""
        self.status = AgentStatus.OFFLINE
        self.updated_at = datetime.now()
        return True
    
    def pause(self) -> bool:
        """Pause the agent."""
        if self.status == AgentStatus.BUSY or self.status == AgentStatus.READY:
            self.status = AgentStatus.PAUSED
            self.updated_at = datetime.now()
            return True
        return False
    
    def resume(self) -> bool:
        """Resume the agent."""
        if self.status == AgentStatus.PAUSED:
            self.status = AgentStatus.READY
            self.updated_at = datetime.now()
            return True
        return False
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a task with the agent.
        To be implemented by subclasses.
        
        Args:
            task: Task to execute
            
        Returns:
            Task result
        """
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        self.updated_at = datetime.now()
        
        # This is a placeholder implementation
        time.sleep(1)  # Simulate processing time
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return {"status": "completed", "result": "Task executed successfully"}
    
    def handle_error(self, error_message: str) -> None:
        """Handle an error in the agent."""
        self.error_count += 1
        self.error_message = error_message
        self.status = AgentStatus.ERROR
        self.updated_at = datetime.now()
        
        logger.error(f"Agent {self.name} ({self.agent_id}) error: {error_message}")
    
    def update_performance_metrics(self, metrics: Dict[str, Any]) -> None:
        """Update the agent's performance metrics."""
        for key, value in metrics.items():
            if key in self.performance_metrics:
                self.performance_metrics[key] = value
        
        self.updated_at = datetime.now()

class ResearchAgent(Agent):
    """Specialized agent for research and information gathering."""
    
    def __init__(self, agent_id: str, name: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type=AgentType.RESEARCH,
            capabilities=["web_search", "information_retrieval", "fact_checking", "summarization"],
            **kwargs
        )
        
        # Research-specific attributes
        self.search_engines = ["google", "bing", "duckduckgo"]
        self.max_sources = 10
        self.max_depth = 3  # How many levels deep to search
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a research task."""
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        
        query = task.get("query")
        if not query:
            return {"status": "error", "message": "No query provided"}
        
        # This would be replaced with actual research code
        logger.info(f"ResearchAgent '{self.name}' researching: {query}")
        
        # Simulate research process
        time.sleep(2)
        
        # Return mock results (in a real implementation, this would be actual research)
        results = {
            "status": "completed", 
            "query": query,
            "sources": [
                {"title": "Source 1", "url": "https://example.com/1", "relevance": 0.95},
                {"title": "Source 2", "url": "https://example.com/2", "relevance": 0.85}
            ],
            "summary": f"Research results for '{query}'.",
            "facts": [f"Fact 1 about {query}", f"Fact 2 about {query}"]
        }
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return results

class PlanningAgent(Agent):
    """Specialized agent for planning and organizing tasks."""
    
    def __init__(self, agent_id: str, name: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type=AgentType.PLANNING,
            capabilities=["task_planning", "resource_allocation", "timeline_generation", "risk_assessment"],
            **kwargs
        )
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a planning task."""
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        
        goal = task.get("goal")
        if not goal:
            return {"status": "error", "message": "No goal provided"}
        
        # This would be replaced with actual planning code
        logger.info(f"PlanningAgent '{self.name}' planning for goal: {goal}")
        
        # Simulate planning process
        time.sleep(2)
        
        # Return mock plan (in a real implementation, this would be a real plan)
        plan = {
            "status": "completed", 
            "goal": goal,
            "tasks": [
                {"id": "task1", "title": f"Research {goal}", "duration": "2h", "dependencies": []},
                {"id": "task2", "title": f"Analyze {goal} requirements", "duration": "3h", "dependencies": ["task1"]},
                {"id": "task3", "title": f"Implement {goal}", "duration": "8h", "dependencies": ["task2"]},
                {"id": "task4", "title": f"Test {goal}", "duration": "4h", "dependencies": ["task3"]},
                {"id": "task5", "title": f"Deploy {goal}", "duration": "2h", "dependencies": ["task4"]}
            ],
            "timeline": {
                "start": datetime.now().isoformat(),
                "end": (datetime.now() + (19 * 3600)).isoformat(),  # 19 hours later
                "milestones": [
                    {"name": "Planning complete", "date": (datetime.now() + (5 * 3600)).isoformat()},
                    {"name": "Implementation complete", "date": (datetime.now() + (16 * 3600)).isoformat()},
                    {"name": "Deployment complete", "date": (datetime.now() + (19 * 3600)).isoformat()}
                ]
            },
            "risks": [
                {"description": f"Risk 1 for {goal}", "probability": "medium", "impact": "high", "mitigation": "Mitigation strategy 1"},
                {"description": f"Risk 2 for {goal}", "probability": "low", "impact": "medium", "mitigation": "Mitigation strategy 2"}
            ]
        }
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return plan

class WebScrapingAgent(Agent):
    """Specialized agent for web scraping and data extraction."""
    
    def __init__(self, agent_id: str, name: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type=AgentType.WEB_SCRAPING,
            capabilities=["web_scraping", "data_extraction", "html_parsing", "structured_data_export"],
            **kwargs
        )
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a web scraping task."""
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        
        target_url = task.get("url")
        selectors = task.get("selectors", {})
        
        if not target_url:
            return {"status": "error", "message": "No URL provided"}
        
        # This would be replaced with actual scraping code using the scraper module
        logger.info(f"WebScrapingAgent '{self.name}' scraping URL: {target_url}")
        
        # Simulate scraping process
        time.sleep(3)
        
        # In a real implementation, we would use our scraper module
        # For now, return mock data
        data = {
            "status": "completed",
            "url": target_url,
            "timestamp": datetime.now().isoformat(),
            "data": [
                {"title": "Item 1", "description": "Description 1", "price": "$10.99"},
                {"title": "Item 2", "description": "Description 2", "price": "$24.99"},
                {"title": "Item 3", "description": "Description 3", "price": "$15.49"}
            ],
            "metadata": {
                "source": "WebScrapingAgent",
                "selectors_used": selectors,
                "items_found": 3
            }
        }
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return data

class CreativeAgent(Agent):
    """Specialized agent for creative tasks and content generation."""
    
    def __init__(self, agent_id: str, name: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type=AgentType.CREATIVE,
            capabilities=["content_generation", "creative_writing", "idea_generation", "story_development"],
            **kwargs
        )
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a creative task."""
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        
        task_type = task.get("type")
        prompt = task.get("prompt")
        
        if not task_type or not prompt:
            return {"status": "error", "message": "Task type and prompt are required"}
        
        # This would be replaced with actual creative generation code
        logger.info(f"CreativeAgent '{self.name}' generating {task_type} with prompt: {prompt}")
        
        # Simulate creative process
        time.sleep(2)
        
        # Generate mock creative content
        if task_type == "story":
            content = f"Once upon a time, {prompt}... [story continues]"
        elif task_type == "ideas":
            content = [
                f"Idea 1 related to {prompt}",
                f"Idea 2 exploring {prompt} from a different angle",
                f"Idea 3 combining {prompt} with something unexpected"
            ]
        elif task_type == "content":
            content = f"# {prompt}\n\nCreative content exploring this fascinating topic...\n\n## Key Points\n\n1. First insight about {prompt}\n2. Second perspective on {prompt}\n3. Innovative approach to {prompt}"
        else:
            content = f"Creative output for: {prompt}"
        
        result = {
            "status": "completed",
            "task_type": task_type,
            "prompt": prompt,
            "content": content,
            "metadata": {
                "creativity_score": 0.85,
                "generation_parameters": {"temperature": 0.8, "top_p": 0.92}
            }
        }
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return result

class VideoAgent(Agent):
    """Specialized agent for video generation and processing."""
    
    def __init__(self, agent_id: str, name: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type=AgentType.VIDEO,
            capabilities=["video_generation", "video_editing", "scene_planning", "storyboarding"],
            **kwargs
        )
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a video task."""
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        
        task_type = task.get("type")
        title = task.get("title")
        description = task.get("description")
        
        if not task_type or not title:
            return {"status": "error", "message": "Task type and title are required"}
        
        # This would be replaced with actual video generation/processing code
        logger.info(f"VideoAgent '{self.name}' working on {task_type} for: {title}")
        
        # Simulate video processing
        time.sleep(5)
        
        # In a real implementation, this would return actual video information
        # For now, return mock data
        result = {
            "status": "completed",
            "task_type": task_type,
            "title": title,
            "description": description,
            "video_metadata": {
                "duration": "02:35",
                "resolution": "1080p",
                "format": "MP4",
                "scenes": [
                    {"start": "00:00", "end": "00:30", "description": "Introduction"},
                    {"start": "00:30", "end": "01:45", "description": "Main content"},
                    {"start": "01:45", "end": "02:35", "description": "Conclusion"}
                ]
            },
            "output_path": f"/data/videos/{title.lower().replace(' ', '_')}.mp4"
        }
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return result

class DocumentAgent(Agent):
    """Specialized agent for document processing and analysis."""
    
    def __init__(self, agent_id: str, name: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type=AgentType.DOCUMENT_PROCESSING,
            capabilities=["document_parsing", "text_extraction", "table_extraction", "document_summarization"],
            **kwargs
        )
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a document processing task."""
        self.status = AgentStatus.BUSY
        self.current_task = task
        self.last_active = datetime.now()
        
        task_type = task.get("type")
        file_path = task.get("file_path")
        
        if not task_type or not file_path:
            return {"status": "error", "message": "Task type and file path are required"}
        
        # This would be replaced with actual document processing code
        logger.info(f"DocumentAgent '{self.name}' processing {task_type} for file: {file_path}")
        
        # Simulate document processing
        time.sleep(3)
        
        # In a real implementation, this would use our document processor module
        # For now, return mock data
        result = {
            "status": "completed",
            "task_type": task_type,
            "file_path": file_path,
            "document_metadata": {
                "pages": 15,
                "word_count": 5280,
                "tables": 3,
                "images": 7
            }
        }
        
        if task_type == "extract_text":
            result["text"] = "Extracted text from the document would be here..."
        elif task_type == "extract_tables":
            result["tables"] = [
                {"rows": 5, "columns": 3, "data": [["Header1", "Header2", "Header3"], ["Data1", "Data2", "Data3"]]},
                {"rows": 8, "columns": 4, "data": [["Header1", "Header2", "Header3", "Header4"], ["Data1", "Data2", "Data3", "Data4"]]}
            ]
        elif task_type == "summarize":
            result["summary"] = "This document discusses the importance of... [summary continues]"
        
        self.status = AgentStatus.READY
        self.current_task = None
        self.performance_metrics["tasks_completed"] += 1
        self.updated_at = datetime.now()
        
        return result

class AgentFactory:
    """Factory for creating agents of different types."""
    
    @staticmethod
    def create_agent(agent_type: Union[AgentType, str], name: str, **kwargs) -> Agent:
        """
        Create an agent of the specified type.
        
        Args:
            agent_type: Type of agent to create
            name: Name for the agent
            **kwargs: Additional arguments for the agent
            
        Returns:
            A new Agent instance
        """
        # Convert string to enum if needed
        if isinstance(agent_type, str):
            agent_type = AgentType(agent_type)
        
        # Generate a unique ID if not provided
        agent_id = kwargs.get("agent_id", str(uuid.uuid4()))
        
        # Create the appropriate agent type
        if agent_type == AgentType.RESEARCH:
            return ResearchAgent(agent_id=agent_id, name=name, **kwargs)
        elif agent_type == AgentType.PLANNING:
            return PlanningAgent(agent_id=agent_id, name=name, **kwargs)
        elif agent_type == AgentType.WEB_SCRAPING:
            return WebScrapingAgent(agent_id=agent_id, name=name, **kwargs)
        elif agent_type == AgentType.CREATIVE:
            return CreativeAgent(agent_id=agent_id, name=name, **kwargs)
        elif agent_type == AgentType.VIDEO:
            return VideoAgent(agent_id=agent_id, name=name, **kwargs)
        elif agent_type == AgentType.DOCUMENT_PROCESSING:
            return DocumentAgent(agent_id=agent_id, name=name, **kwargs)
        else:
            # Default to base agent for unsupported types
            return Agent(
                agent_id=agent_id, 
                name=name, 
                agent_type=agent_type,
                **kwargs
            )

class AgentTeam:
    """A team of agents working together on a task or project."""
    
    def __init__(self, team_id: str, name: str, description: str = ""):
        """
        Initialize an agent team.
        
        Args:
            team_id: Unique identifier for the team
            name: Name of the team
            description: Description of the team's purpose
        """
        self.team_id = team_id
        self.name = name
        self.description = description
        self.members = {}  # agent_id -> role
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.active = True
        self.tasks = []
        self.leader_id = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert team to a dictionary for serialization."""
        return {
            "team_id": self.team_id,
            "name": self.name,
            "description": self.description,
            "members": self.members,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "active": self.active,
            "tasks": self.tasks,
            "leader_id": self.leader_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentTeam':
        """Create an AgentTeam instance from a dictionary."""
        team = cls(
            team_id=data["team_id"],
            name=data["name"],
            description=data.get("description", "")
        )
        
        team.members = data.get("members", {})
        team.created_at = datetime.fromisoformat(data["created_at"])
        team.updated_at = datetime.fromisoformat(data["updated_at"])
        team.active = data.get("active", True)
        team.tasks = data.get("tasks", [])
        team.leader_id = data.get("leader_id")
        
        return team
    
    def add_member(self, agent_id: str, role: str) -> bool:
        """Add a member to the team."""
        if agent_id not in self.members:
            self.members[agent_id] = role
            self.updated_at = datetime.now()
            return True
        return False
    
    def remove_member(self, agent_id: str) -> bool:
        """Remove a member from the team."""
        if agent_id in self.members:
            del self.members[agent_id]
            
            # If this was the leader, clear the leader_id
            if self.leader_id == agent_id:
                self.leader_id = None
                
            self.updated_at = datetime.now()
            return True
        return False
    
    def set_leader(self, agent_id: str) -> bool:
        """Set the team leader."""
        if agent_id in self.members:
            self.leader_id = agent_id
            self.updated_at = datetime.now()
            return True
        return False
    
    def add_task(self, task: Dict[str, Any]) -> str:
        """
        Add a task for the team to work on.
        
        Args:
            task: Task information
            
        Returns:
            Task ID
        """
        # Generate a task ID if not provided
        if "task_id" not in task:
            task["task_id"] = str(uuid.uuid4())
        
        # Add timestamps
        task["created_at"] = datetime.now().isoformat()
        task["updated_at"] = datetime.now().isoformat()
        task["status"] = task.get("status", "pending")
        
        self.tasks.append(task)
        self.updated_at = datetime.now()
        
        return task["task_id"]
    
    def update_task(self, task_id: str, updates: Dict[str, Any]) -> bool:
        """Update a task."""
        for i, task in enumerate(self.tasks):
            if task.get("task_id") == task_id:
                self.tasks[i].update(updates)
                self.tasks[i]["updated_at"] = datetime.now().isoformat()
                self.updated_at = datetime.now()
                return True
        return False
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get a task by ID."""
        for task in self.tasks:
            if task.get("task_id") == task_id:
                return task
        return None
    
    def get_member_tasks(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get all tasks assigned to a team member."""
        return [task for task in self.tasks if task.get("assigned_to") == agent_id]

class AgentManagementSystem:
    """System for managing agents and teams."""
    
    def __init__(self):
        """Initialize the agent management system."""
        self.agents = {}  # agent_id -> Agent
        self.teams = {}  # team_id -> AgentTeam
        self.data_dir = "./data/agents"
        self.agents_file = os.path.join(self.data_dir, "agents.json")
        self.teams_file = os.path.join(self.data_dir, "teams.json")
        
        # Create data directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load data from disk
        self.load_data()
        
        # Start a background thread for agent monitoring
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_agents)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def load_data(self):
        """Load agents and teams from disk."""
        # Load agents
        if os.path.exists(self.agents_file):
            try:
                with open(self.agents_file, 'r') as f:
                    agents_data = json.load(f)
                
                for agent_data in agents_data:
                    agent_type = AgentType(agent_data["agent_type"])
                    agent = AgentFactory.create_agent(
                        agent_type=agent_type,
                        name=agent_data["name"],
                        agent_id=agent_data["agent_id"],
                        description=agent_data.get("description", ""),
                        capabilities=agent_data.get("capabilities", []),
                        skills=agent_data.get("skills", {}),
                        metadata=agent_data.get("metadata", {})
                    )
                    
                    # Set runtime attributes
                    agent.status = AgentStatus(agent_data["status"])
                    agent.created_at = datetime.fromisoformat(agent_data["created_at"])
                    agent.updated_at = datetime.fromisoformat(agent_data["updated_at"])
                    agent.last_active = datetime.fromisoformat(agent_data["last_active"]) if agent_data.get("last_active") else None
                    agent.current_task = agent_data.get("current_task")
                    agent.performance_metrics = agent_data.get("performance_metrics", {})
                    agent.error_count = agent_data.get("error_count", 0)
                    agent.error_message = agent_data.get("error_message")
                    
                    self.agents[agent.agent_id] = agent
                
                logger.info(f"Loaded {len(self.agents)} agents")
            except Exception as e:
                logger.error(f"Error loading agents: {str(e)}")
        
        # Load teams
        if os.path.exists(self.teams_file):
            try:
                with open(self.teams_file, 'r') as f:
                    teams_data = json.load(f)
                
                for team_data in teams_data:
                    team = AgentTeam.from_dict(team_data)
                    self.teams[team.team_id] = team
                
                logger.info(f"Loaded {len(self.teams)} teams")
            except Exception as e:
                logger.error(f"Error loading teams: {str(e)}")
    
    def save_data(self):
        """Save agents and teams to disk."""
        # Save agents
        try:
            agents_data = [agent.to_dict() for agent in self.agents.values()]
            with open(self.agents_file, 'w') as f:
                json.dump(agents_data, f, indent=2)
            
            logger.info(f"Saved {len(self.agents)} agents")
        except Exception as e:
            logger.error(f"Error saving agents: {str(e)}")
        
        # Save teams
        try:
            teams_data = [team.to_dict() for team in self.teams.values()]
            with open(self.teams_file, 'w') as f:
                json.dump(teams_data, f, indent=2)
            
            logger.info(f"Saved {len(self.teams)} teams")
        except Exception as e:
            logger.error(f"Error saving teams: {str(e)}")
    
    def _monitor_agents(self):
        """Monitor agents for health and status updates."""
        while self.monitoring:
            try:
                for agent_id, agent in list(self.agents.items()):
                    # Check for error status that needs recovery
                    if agent.status == AgentStatus.ERROR:
                        logger.info(f"Attempting to recover agent {agent.name} from error state")
                        try:
                            # Attempt to restart the agent
                            agent.stop()
                            time.sleep(1)
                            agent.start()
                            
                            # Clear error state if successful
                            if agent.status == AgentStatus.READY:
                                agent.error_message = None
                                logger.info(f"Successfully recovered agent {agent.name}")
                        except Exception as e:
                            agent.error_count += 1
                            agent.error_message = f"Recovery failed: {str(e)}"
                            logger.error(f"Failed to recover agent {agent.name}: {str(e)}")
            except Exception as e:
                logger.error(f"Error in agent monitoring thread: {str(e)}")
            
            # Sleep before next check
            time.sleep(30)
    
    def create_agent(self, agent_type: Union[AgentType, str], name: str, **kwargs) -> Agent:
        """
        Create a new agent.
        
        Args:
            agent_type: Type of agent to create
            name: Name for the agent
            **kwargs: Additional arguments for the agent
            
        Returns:
            The created Agent instance
        """
        agent = AgentFactory.create_agent(agent_type, name, **kwargs)
        
        # Start the agent
        agent.start()
        
        # Add to our collection
        self.agents[agent.agent_id] = agent
        
        # Save changes
        self.save_data()
        
        logger.info(f"Created {agent_type} agent '{name}' with ID {agent.agent_id}")
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an agent by ID."""
        return self.agents.get(agent_id)
    
    def update_agent(self, agent_id: str, **kwargs) -> Optional[Agent]:
        """Update an agent's attributes."""
        agent = self.agents.get(agent_id)
        if not agent:
            return None
        
        # Update agent attributes
        for key, value in kwargs.items():
            if key == "status" and isinstance(value, str):
                value = AgentStatus(value)
            
            if hasattr(agent, key):
                setattr(agent, key, value)
        
        agent.updated_at = datetime.now()
        
        # Save changes
        self.save_data()
        
        logger.info(f"Updated agent '{agent.name}' (ID: {agent_id})")
        return agent
    
    def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent."""
        agent = self.agents.get(agent_id)
        if not agent:
            return False
        
        # Remove from teams
        for team in self.teams.values():
            if agent_id in team.members:
                team.remove_member(agent_id)
        
        # Stop the agent
        agent.stop()
        
        # Remove from our collection
        del self.agents[agent_id]
        
        # Save changes
        self.save_data()
        
        logger.info(f"Deleted agent '{agent.name}' (ID: {agent_id})")
        return True
    
    def list_agents(self, agent_type: Union[AgentType, str] = None, 
                   status: Union[AgentStatus, str] = None,
                   capability: str = None) -> List[Dict[str, Any]]:
        """List agents with optional filtering."""
        # Convert string enums to enum objects if needed
        if isinstance(agent_type, str) and agent_type:
            agent_type = AgentType(agent_type)
        
        if isinstance(status, str) and status:
            status = AgentStatus(status)
        
        # Filter agents
        filtered_agents = list(self.agents.values())
        
        if agent_type:
            filtered_agents = [a for a in filtered_agents if a.agent_type == agent_type]
        
        if status:
            filtered_agents = [a for a in filtered_agents if a.status == status]
        
        if capability:
            filtered_agents = [a for a in filtered_agents if capability in a.capabilities]
        
        # Convert to simplified dictionaries
        result = []
        for agent in filtered_agents:
            result.append({
                "agent_id": agent.agent_id,
                "name": agent.name,
                "agent_type": agent.agent_type.value,
                "status": agent.status.value,
                "capabilities": agent.capabilities,
                "created_at": agent.created_at.isoformat(),
                "tasks_completed": agent.performance_metrics.get("tasks_completed", 0)
            })
        
        return result
    
    def create_team(self, name: str, description: str = "") -> AgentTeam:
        """Create a new team."""
        team_id = str(uuid.uuid4())
        team = AgentTeam(team_id, name, description)
        
        self.teams[team_id] = team
        self.save_data()
        
        logger.info(f"Created team '{name}' with ID {team_id}")
        return team
    
    def get_team(self, team_id: str) -> Optional[AgentTeam]:
        """Get a team by ID."""
        return self.teams.get(team_id)
    
    def delete_team(self, team_id: str) -> bool:
        """Delete a team."""
        if team_id in self.teams:
            team = self.teams[team_id]
            del self.teams[team_id]
            self.save_data()
            
            logger.info(f"Deleted team '{team.name}' (ID: {team_id})")
            return True
        return False
    
    def list_teams(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """List teams with optional filtering."""
        filtered_teams = list(self.teams.values())
        
        if active_only:
            filtered_teams = [t for t in filtered_teams if t.active]
        
        # Convert to simplified dictionaries
        result = []
        for team in filtered_teams:
            result.append({
                "team_id": team.team_id,
                "name": team.name,
                "description": team.description,
                "active": team.active,
                "created_at": team.created_at.isoformat(),
                "member_count": len(team.members),
                "task_count": len(team.tasks)
            })
        
        return result
    
    def add_agent_to_team(self, agent_id: str, team_id: str, role: str) -> bool:
        """Add an agent to a team."""
        agent = self.agents.get(agent_id)
        team = self.teams.get(team_id)
        
        if not agent or not team:
            return False
        
        # Add agent to team
        success = team.add_member(agent_id, role)
        
        if success:
            self.save_data()
            logger.info(f"Added agent '{agent.name}' to team '{team.name}' as {role}")
        
        return success
    
    def remove_agent_from_team(self, agent_id: str, team_id: str) -> bool:
        """Remove an agent from a team."""
        team = self.teams.get(team_id)
        
        if not team:
            return False
        
        # Remove agent from team
        success = team.remove_member(agent_id)
        
        if success:
            self.save_data()
            logger.info(f"Removed agent {agent_id} from team '{team.name}'")
        
        return success
    
    def execute_agent_task(self, agent_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a task with a specific agent.
        
        Args:
            agent_id: ID of the agent to use
            task: Task to execute
            
        Returns:
            Task result
        """
        agent = self.agents.get(agent_id)
        if not agent:
            return {"status": "error", "message": f"Agent {agent_id} not found"}
        
        if agent.status != AgentStatus.READY:
            return {"status": "error", "message": f"Agent {agent.name} is not ready (status: {agent.status.value})"}
        
        try:
            # Record the start time
            start_time = time.time()
            
            # Execute the task
            result = agent.execute_task(task)
            
            # Calculate task duration
            duration = time.time() - start_time
            
            # Update agent performance metrics
            current_avg_time = agent.performance_metrics.get("average_response_time", 0)
            tasks_completed = agent.performance_metrics.get("tasks_completed", 0)
            
            if tasks_completed > 0:
                # Calculate new average
                new_avg_time = (current_avg_time * (tasks_completed - 1) + duration) / tasks_completed
            else:
                new_avg_time = duration
            
            agent.performance_metrics["average_response_time"] = new_avg_time
            agent.performance_metrics["total_runtime"] += duration
            
            # Calculate success rate
            if result.get("status") == "completed":
                success_count = agent.performance_metrics.get("success_count", 0) + 1
                agent.performance_metrics["success_count"] = success_count
                agent.performance_metrics["success_rate"] = success_count / tasks_completed
            
            self.save_data()
            
            return result
            
        except Exception as e:
            agent.handle_error(str(e))
            self.save_data()
            
            logger.error(f"Error executing task on agent '{agent.name}': {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def execute_team_task(self, team_id: str, task: Dict[str, Any]) -> Dict[str, str]:
        """
        Assign a task to a team and execute it.
        
        Args:
            team_id: ID of the team to use
            task: Task to execute
            
        Returns:
            Dictionary mapping task IDs to their statuses
        """
        team = self.teams.get(team_id)
        if not team:
            return {"status": "error", "message": f"Team {team_id} not found"}
        
        if not team.members:
            return {"status": "error", "message": f"Team '{team.name}' has no members"}
        
        # Add the task to the team
        task_id = team.add_task(task)
        
        # Determine which agent should execute each subtask
        # In a real implementation, this would be more sophisticated
        results = {}
        
        # For demonstration purposes, we'll assign to the first available agent
        for agent_id, role in team.members.items():
            agent = self.agents.get(agent_id)
            if not agent or agent.status != AgentStatus.READY:
                continue
            
            try:
                # Execute the task with this agent
                result = agent.execute_task(task)
                
                # Update the task status
                team.update_task(task_id, {
                    "status": result.get("status", "unknown"),
                    "assigned_to": agent_id,
                    "result": result
                })
                
                results[task_id] = "completed"
                break
            except Exception as e:
                results[task_id] = f"error: {str(e)}"
                
                # Update the task status
                team.update_task(task_id, {
                    "status": "error",
                    "assigned_to": agent_id,
                    "error": str(e)
                })
                
                logger.error(f"Error executing task on agent '{agent.name}': {str(e)}")
        
        self.save_data()
        
        return results
    
    def find_suitable_agent(self, capabilities: List[str] = None, 
                           skills: Dict[str, float] = None) -> Optional[Agent]:
        """
        Find an agent that matches the given capabilities and skills.
        
        Args:
            capabilities: Required capabilities
            skills: Required skills with minimum proficiency levels
            
        Returns:
            A suitable Agent instance, or None if none found
        """
        available_agents = []
        
        for agent in self.agents.values():
            if agent.status != AgentStatus.READY:
                continue
            
            # Check capabilities
            if capabilities:
                if not all(cap in agent.capabilities for cap in capabilities):
                    continue
            
            # Check skills
            if skills:
                if not all(agent.skills.get(skill, 0) >= level for skill, level in skills.items()):
                    continue
            
            # This agent matches requirements
            available_agents.append(agent)
        
        if not available_agents:
            return None
        
        # Find the agent with the highest success rate
        return max(available_agents, key=lambda a: a.performance_metrics.get("success_rate", 0))
    
    def form_optimal_team(self, required_capabilities: List[str], 
                         team_name: str = None) -> Optional[AgentTeam]:
        """
        Form an optimal team with agents that collectively cover all required capabilities.
        
        Args:
            required_capabilities: List of capabilities that the team should cover
            team_name: Name for the new team
            
        Returns:
            A new AgentTeam instance, or None if requirements can't be met
        """
        # Track which capabilities we still need to cover
        needed_capabilities = set(required_capabilities)
        
        # Find agents to cover the capabilities
        chosen_agents = {}  # agent_id -> list of capabilities it would cover
        
        # Keep adding agents until we've covered all capabilities or run out of options
        while needed_capabilities and self.agents:
            best_agent = None
            best_coverage = 0
            
            for agent in self.agents.values():
                if agent.status != AgentStatus.READY or agent.agent_id in chosen_agents:
                    continue
                
                # Calculate how many needed capabilities this agent would cover
                agent_capabilities = set(agent.capabilities) & needed_capabilities
                coverage = len(agent_capabilities)
                
                if coverage > best_coverage:
                    best_agent = agent
                    best_coverage = coverage
            
            if best_agent and best_coverage > 0:
                # This agent covers some needed capabilities
                covered_capabilities = set(best_agent.capabilities) & needed_capabilities
                chosen_agents[best_agent.agent_id] = list(covered_capabilities)
                needed_capabilities -= covered_capabilities
            else:
                # No agent can cover the remaining capabilities
                break
        
        if needed_capabilities:
            # We couldn't cover all required capabilities
            logger.warning(f"Could not form a team for capabilities: {needed_capabilities}")
            return None
        
        # Create a new team
        if not team_name:
            team_name = f"Team {str(uuid.uuid4())[:8]}"
            
        team = self.create_team(team_name, f"Team formed to cover: {', '.join(required_capabilities)}")
        
        # Add agents to the team
        for agent_id, covered_caps in chosen_agents.items():
            agent = self.agents[agent_id]
            role = "_".join(covered_caps[:2]) if covered_caps else agent.agent_type.value
            team.add_member(agent_id, role)
        
        # Set the agent with the broadest capability set as the leader
        if chosen_agents:
            leader_id = max(chosen_agents.items(), key=lambda x: len(x[1]))[0]
            team.set_leader(leader_id)
        
        self.save_data()
        
        logger.info(f"Formed team '{team.name}' with {len(team.members)} agents to cover {len(required_capabilities)} capabilities")
        return team
    
    def shutdown(self):
        """Shutdown the agent management system."""
        logger.info("Shutting down agent management system")
        
        # Stop monitoring
        self.monitoring = False
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        
        # Stop all agents
        for agent in self.agents.values():
            try:
                agent.stop()
            except Exception as e:
                logger.error(f"Error stopping agent '{agent.name}': {str(e)}")
        
        # Save final state
        self.save_data()
        
        logger.info("Agent management system shut down")

# For testing
if __name__ == "__main__":
    # Create an agent management system
    ams = AgentManagementSystem()
    
    try:
        # Create some test agents
        research_agent = ams.create_agent(
            agent_type=AgentType.RESEARCH,
            name="Research Agent"
        )
        
        planning_agent = ams.create_agent(
            agent_type=AgentType.PLANNING,
            name="Planning Agent"
        )
        
        creative_agent = ams.create_agent(
            agent_type=AgentType.CREATIVE,
            name="Creative Agent"
        )
        
        # Create a team
        team = ams.create_team("Research and Planning Team", "Team for research and planning tasks")
        
        # Add agents to the team
        ams.add_agent_to_team(research_agent.agent_id, team.team_id, "researcher")
        ams.add_agent_to_team(planning_agent.agent_id, team.team_id, "planner")
        
        # Execute a task with the research agent
        result = ams.execute_agent_task(research_agent.agent_id, {
            "query": "Machine learning techniques for natural language processing"
        })
        
        print(f"Research task result: {result.get('status')}")
        
        # Execute a team task
        team_result = ams.execute_team_task(team.team_id, {
            "title": "Research and plan an ML project",
            "description": "Research ML techniques and plan a project"
        })
        
        print(f"Team task result: {team_result}")
        
    finally:
        # Shut down the system
        ams.shutdown()