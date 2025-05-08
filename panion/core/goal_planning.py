"""
Goal Planning System
Helps users create detailed plans, break down goals, and manage project execution.
"""

import os
import json
import logging
import uuid
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GoalStatus(Enum):
    """Status of a goal or task."""
    PLANNING = "planning"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class GoalPriority(Enum):
    """Priority level for goals."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class GoalCategory(Enum):
    """Categories for goals."""
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    HEALTH = "health"
    FINANCIAL = "financial"
    EDUCATION = "education"
    CREATIVE = "creative"
    OTHER = "other"

class Task:
    """Individual task within a project plan."""
    
    def __init__(self, 
                task_id: str,
                title: str,
                description: str = "",
                status: GoalStatus = GoalStatus.READY,
                priority: GoalPriority = GoalPriority.MEDIUM,
                estimated_hours: float = 1.0,
                assigned_agents: List[str] = None,
                dependencies: List[str] = None,
                tags: List[str] = None):
        """
        Initialize a task.
        
        Args:
            task_id: Unique identifier for the task
            title: Title of the task
            description: Detailed description
            status: Current status
            priority: Priority level
            estimated_hours: Estimated time to complete in hours
            assigned_agents: List of agent IDs assigned to this task
            dependencies: List of task IDs that must be completed before this one
            tags: List of tags for categorization
        """
        self.task_id = task_id
        self.title = title
        self.description = description
        self.status = status
        self.priority = priority
        self.estimated_hours = estimated_hours
        self.assigned_agents = assigned_agents or []
        self.dependencies = dependencies or []
        self.tags = tags or []
        
        # Runtime attributes
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.started_at = None
        self.completed_at = None
        self.progress = 0  # 0-100
        self.notes = []
        self.blockers = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "title": self.title,
            "description": self.description,
            "status": self.status.value,
            "priority": self.priority.value,
            "estimated_hours": self.estimated_hours,
            "assigned_agents": self.assigned_agents,
            "dependencies": self.dependencies,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress": self.progress,
            "notes": self.notes,
            "blockers": self.blockers
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create a Task instance from a dictionary."""
        task = cls(
            task_id=data["task_id"],
            title=data["title"],
            description=data.get("description", ""),
            status=GoalStatus(data["status"]),
            priority=GoalPriority(data["priority"]),
            estimated_hours=data.get("estimated_hours", 1.0),
            assigned_agents=data.get("assigned_agents", []),
            dependencies=data.get("dependencies", []),
            tags=data.get("tags", [])
        )
        
        # Set runtime attributes
        task.created_at = datetime.fromisoformat(data["created_at"])
        task.updated_at = datetime.fromisoformat(data["updated_at"])
        task.started_at = datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None
        task.completed_at = datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None
        task.progress = data.get("progress", 0)
        task.notes = data.get("notes", [])
        task.blockers = data.get("blockers", [])
        
        return task
    
    def add_note(self, note: str, author: str = "system"):
        """Add a note to the task."""
        self.notes.append({
            "text": note,
            "author": author,
            "timestamp": datetime.now().isoformat()
        })
        self.updated_at = datetime.now()
    
    def add_blocker(self, description: str, severity: str = "medium"):
        """Add a blocker that's preventing progress."""
        self.blockers.append({
            "description": description,
            "severity": severity,
            "reported_at": datetime.now().isoformat(),
            "resolved": False
        })
        self.updated_at = datetime.now()
        
        if self.status != GoalStatus.BLOCKED:
            self.status = GoalStatus.BLOCKED
    
    def resolve_blocker(self, index: int, resolution: str):
        """Mark a blocker as resolved."""
        if 0 <= index < len(self.blockers):
            self.blockers[index]["resolved"] = True
            self.blockers[index]["resolution"] = resolution
            self.blockers[index]["resolved_at"] = datetime.now().isoformat()
            self.updated_at = datetime.now()
            
            # Check if all blockers are resolved
            if all(blocker["resolved"] for blocker in self.blockers):
                self.status = GoalStatus.IN_PROGRESS

class Project:
    """Project containing multiple tasks and a goal."""
    
    def __init__(self,
                project_id: str,
                title: str,
                description: str,
                goal: str,
                category: GoalCategory = GoalCategory.OTHER,
                priority: GoalPriority = GoalPriority.MEDIUM,
                deadline: Optional[datetime] = None,
                tags: List[str] = None):
        """
        Initialize a project.
        
        Args:
            project_id: Unique identifier for the project
            title: Title of the project
            description: Detailed description
            goal: The main goal or objective
            category: Project category
            priority: Priority level
            deadline: Target completion date
            tags: List of tags for categorization
        """
        self.project_id = project_id
        self.title = title
        self.description = description
        self.goal = goal
        self.category = category
        self.priority = priority
        self.deadline = deadline
        self.tags = tags or []
        
        # Runtime attributes
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.started_at = None
        self.completed_at = None
        self.status = GoalStatus.PLANNING
        self.tasks = {}  # task_id -> Task
        self.notes = []
        self.team = []  # List of agent IDs
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "project_id": self.project_id,
            "title": self.title,
            "description": self.description,
            "goal": self.goal,
            "category": self.category.value,
            "priority": self.priority.value,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "tags": self.tags,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "status": self.status.value,
            "tasks": {task_id: task.to_dict() for task_id, task in self.tasks.items()},
            "notes": self.notes,
            "team": self.team
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Project':
        """Create a Project instance from a dictionary."""
        project = cls(
            project_id=data["project_id"],
            title=data["title"],
            description=data["description"],
            goal=data["goal"],
            category=GoalCategory(data["category"]),
            priority=GoalPriority(data["priority"]),
            deadline=datetime.fromisoformat(data["deadline"]) if data.get("deadline") else None,
            tags=data.get("tags", [])
        )
        
        # Set runtime attributes
        project.created_at = datetime.fromisoformat(data["created_at"])
        project.updated_at = datetime.fromisoformat(data["updated_at"])
        project.started_at = datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None
        project.completed_at = datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None
        project.status = GoalStatus(data["status"])
        project.notes = data.get("notes", [])
        project.team = data.get("team", [])
        
        # Load tasks
        for task_id, task_data in data.get("tasks", {}).items():
            project.tasks[task_id] = Task.from_dict(task_data)
        
        return project
    
    def add_task(self, title: str, description: str = "", **kwargs) -> Task:
        """Add a new task to the project."""
        task_id = str(uuid.uuid4())
        task = Task(
            task_id=task_id,
            title=title,
            description=description,
            **kwargs
        )
        self.tasks[task_id] = task
        self.updated_at = datetime.now()
        return task
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        return self.tasks.get(task_id)
    
    def update_task(self, task_id: str, **kwargs) -> Optional[Task]:
        """Update a task's attributes."""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        # Update task attributes
        for key, value in kwargs.items():
            if key == "status" and isinstance(value, str):
                value = GoalStatus(value)
            elif key == "priority" and isinstance(value, str):
                value = GoalPriority(value)
            
            if hasattr(task, key):
                setattr(task, key, value)
        
        task.updated_at = datetime.now()
        self.updated_at = datetime.now()
        
        # If task is started for the first time, set started_at
        if task.status == GoalStatus.IN_PROGRESS and not task.started_at:
            task.started_at = datetime.now()
            
            # If this is the first task to start, set project started_at
            if not self.started_at:
                self.started_at = datetime.now()
                self.status = GoalStatus.IN_PROGRESS
        
        # If task is completed, set completed_at
        if task.status == GoalStatus.COMPLETED and not task.completed_at:
            task.completed_at = datetime.now()
            task.progress = 100
            
            # Check if all tasks are completed
            if all(t.status == GoalStatus.COMPLETED for t in self.tasks.values()):
                self.completed_at = datetime.now()
                self.status = GoalStatus.COMPLETED
        
        return task
    
    def delete_task(self, task_id: str) -> bool:
        """Delete a task from the project."""
        if task_id in self.tasks:
            del self.tasks[task_id]
            self.updated_at = datetime.now()
            return True
        return False
    
    def get_progress(self) -> float:
        """Calculate the overall project progress (0-100)."""
        if not self.tasks:
            return 0.0
        
        total_progress = sum(task.progress for task in self.tasks.values())
        return total_progress / len(self.tasks)
    
    def get_critical_path(self) -> List[str]:
        """Calculate the critical path of tasks (those that determine the project timeline)."""
        # For simplicity, this is a naive implementation
        # In a real system, you'd use a proper critical path algorithm
        
        # Get all tasks with dependencies
        dependent_tasks = {task_id: task for task_id, task in self.tasks.items() if task.dependencies}
        
        # Get tasks that are depended upon
        dependency_tasks = set()
        for task in dependent_tasks.values():
            dependency_tasks.update(task.dependencies)
        
        # The critical path includes all dependency tasks and dependent tasks
        critical_path = list(dependency_tasks) + list(dependent_tasks.keys())
        
        # Sort by dependencies to get the correct order
        sorted_path = []
        remaining = set(critical_path)
        
        # Add tasks with no dependencies first
        no_deps = [task_id for task_id in critical_path if not self.tasks.get(task_id, Task("", "")).dependencies]
        sorted_path.extend(no_deps)
        remaining -= set(no_deps)
        
        # Keep adding tasks whose dependencies are already in the sorted path
        while remaining:
            for task_id in list(remaining):
                task = self.tasks.get(task_id)
                if not task:
                    remaining.remove(task_id)
                    continue
                    
                if all(dep in sorted_path for dep in task.dependencies):
                    sorted_path.append(task_id)
                    remaining.remove(task_id)
            
            # If we couldn't add any tasks in this iteration, there's a cycle
            if not sorted_path:
                break
        
        return sorted_path
    
    def add_team_member(self, agent_id: str) -> bool:
        """Add an agent to the project team."""
        if agent_id not in self.team:
            self.team.append(agent_id)
            self.updated_at = datetime.now()
            return True
        return False
    
    def remove_team_member(self, agent_id: str) -> bool:
        """Remove an agent from the project team."""
        if agent_id in self.team:
            self.team.remove(agent_id)
            
            # Remove agent from task assignments
            for task in self.tasks.values():
                if agent_id in task.assigned_agents:
                    task.assigned_agents.remove(agent_id)
                    task.updated_at = datetime.now()
            
            self.updated_at = datetime.now()
            return True
        return False
    
    def add_note(self, note: str, author: str = "system"):
        """Add a note to the project."""
        self.notes.append({
            "text": note,
            "author": author,
            "timestamp": datetime.now().isoformat()
        })
        self.updated_at = datetime.now()
    
    def reassign_tasks(self, from_agent_id: str, to_agent_id: str) -> int:
        """Reassign all tasks from one agent to another."""
        count = 0
        for task in self.tasks.values():
            if from_agent_id in task.assigned_agents:
                task.assigned_agents.remove(from_agent_id)
                if to_agent_id not in task.assigned_agents:
                    task.assigned_agents.append(to_agent_id)
                task.updated_at = datetime.now()
                count += 1
        
        if count > 0:
            self.updated_at = datetime.now()
        
        return count

class GoalPlanningSystem:
    """System for managing projects, goals, and tasks."""
    
    def __init__(self):
        """Initialize the goal planning system."""
        self.projects = {}  # project_id -> Project
        self.agents = {}  # agent_id -> Agent metadata
        self.data_dir = "./data/goals"
        self.projects_file = os.path.join(self.data_dir, "projects.json")
        self.agents_file = os.path.join(self.data_dir, "agents.json")
        
        # Create data directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load data from disk
        self.load_data()
    
    def load_data(self):
        """Load projects and agents from disk."""
        # Load projects
        if os.path.exists(self.projects_file):
            try:
                with open(self.projects_file, 'r') as f:
                    projects_data = json.load(f)
                
                for project_data in projects_data:
                    project = Project.from_dict(project_data)
                    self.projects[project.project_id] = project
                
                logger.info(f"Loaded {len(self.projects)} projects")
            except Exception as e:
                logger.error(f"Error loading projects: {str(e)}")
        
        # Load agents
        if os.path.exists(self.agents_file):
            try:
                with open(self.agents_file, 'r') as f:
                    self.agents = json.load(f)
                
                logger.info(f"Loaded {len(self.agents)} agents")
            except Exception as e:
                logger.error(f"Error loading agents: {str(e)}")
    
    def save_data(self):
        """Save projects and agents to disk."""
        # Save projects
        try:
            projects_data = [project.to_dict() for project in self.projects.values()]
            with open(self.projects_file, 'w') as f:
                json.dump(projects_data, f, indent=2)
            
            logger.info(f"Saved {len(self.projects)} projects")
        except Exception as e:
            logger.error(f"Error saving projects: {str(e)}")
        
        # Save agents
        try:
            with open(self.agents_file, 'w') as f:
                json.dump(self.agents, f, indent=2)
            
            logger.info(f"Saved {len(self.agents)} agents")
        except Exception as e:
            logger.error(f"Error saving agents: {str(e)}")
    
    def create_project(self, title: str, description: str, goal: str, **kwargs) -> Project:
        """Create a new project."""
        project_id = str(uuid.uuid4())
        project = Project(
            project_id=project_id,
            title=title,
            description=description,
            goal=goal,
            **kwargs
        )
        self.projects[project_id] = project
        self.save_data()
        logger.info(f"Created project '{title}' (ID: {project_id})")
        return project
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """Get a project by ID."""
        return self.projects.get(project_id)
    
    def update_project(self, project_id: str, **kwargs) -> Optional[Project]:
        """Update a project's attributes."""
        project = self.projects.get(project_id)
        if not project:
            return None
        
        # Update project attributes
        for key, value in kwargs.items():
            if key == "status" and isinstance(value, str):
                value = GoalStatus(value)
            elif key == "priority" and isinstance(value, str):
                value = GoalPriority(value)
            elif key == "category" and isinstance(value, str):
                value = GoalCategory(value)
            elif key == "deadline" and isinstance(value, str):
                value = datetime.fromisoformat(value)
            
            if hasattr(project, key):
                setattr(project, key, value)
        
        project.updated_at = datetime.now()
        self.save_data()
        
        logger.info(f"Updated project '{project.title}' (ID: {project_id})")
        return project
    
    def delete_project(self, project_id: str) -> bool:
        """Delete a project."""
        if project_id in self.projects:
            project = self.projects[project_id]
            del self.projects[project_id]
            self.save_data()
            
            logger.info(f"Deleted project '{project.title}' (ID: {project_id})")
            return True
        return False
    
    def list_projects(self, status: Union[GoalStatus, str] = None, 
                     category: Union[GoalCategory, str] = None,
                     priority: Union[GoalPriority, str] = None,
                     tag: str = None) -> List[Dict[str, Any]]:
        """List projects with optional filtering."""
        # Convert string enums to enum objects if needed
        if isinstance(status, str) and status:
            status = GoalStatus(status)
        
        if isinstance(category, str) and category:
            category = GoalCategory(category)
        
        if isinstance(priority, str) and priority:
            priority = GoalPriority(priority)
        
        # Filter projects
        filtered_projects = list(self.projects.values())
        
        if status:
            filtered_projects = [p for p in filtered_projects if p.status == status]
        
        if category:
            filtered_projects = [p for p in filtered_projects if p.category == category]
        
        if priority:
            filtered_projects = [p for p in filtered_projects if p.priority == priority]
        
        if tag:
            filtered_projects = [p for p in filtered_projects if tag in p.tags]
        
        # Convert to simplified dictionaries
        result = []
        for project in filtered_projects:
            result.append({
                "project_id": project.project_id,
                "title": project.title,
                "goal": project.goal,
                "status": project.status.value,
                "category": project.category.value,
                "priority": project.priority.value,
                "created_at": project.created_at.isoformat(),
                "deadline": project.deadline.isoformat() if project.deadline else None,
                "task_count": len(project.tasks),
                "progress": project.get_progress(),
                "team_size": len(project.team)
            })
        
        return result
    
    def register_agent(self, agent_id: str, name: str, capabilities: List[str], 
                      skills: Dict[str, float]) -> Dict[str, Any]:
        """Register a new agent or update an existing one."""
        agent_data = {
            "agent_id": agent_id,
            "name": name,
            "capabilities": capabilities,
            "skills": skills,
            "status": "available",
            "current_projects": [],
            "updated_at": datetime.now().isoformat()
        }
        
        if agent_id in self.agents:
            # Preserve current projects for existing agent
            agent_data["current_projects"] = self.agents[agent_id].get("current_projects", [])
            logger.info(f"Updated agent '{name}' (ID: {agent_id})")
        else:
            logger.info(f"Registered new agent '{name}' (ID: {agent_id})")
        
        self.agents[agent_id] = agent_data
        self.save_data()
        
        return agent_data
    
    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent metadata by ID."""
        return self.agents.get(agent_id)
    
    def update_agent_status(self, agent_id: str, status: str) -> bool:
        """Update an agent's status."""
        if agent_id in self.agents:
            self.agents[agent_id]["status"] = status
            self.agents[agent_id]["updated_at"] = datetime.now().isoformat()
            self.save_data()
            logger.info(f"Updated agent {agent_id} status to '{status}'")
            return True
        return False
    
    def assign_agent_to_project(self, agent_id: str, project_id: str) -> bool:
        """Assign an agent to a project."""
        agent = self.agents.get(agent_id)
        project = self.projects.get(project_id)
        
        if not agent or not project:
            return False
        
        # Add project to agent's current projects
        if project_id not in agent.get("current_projects", []):
            if "current_projects" not in agent:
                agent["current_projects"] = []
            agent["current_projects"].append(project_id)
            agent["updated_at"] = datetime.now().isoformat()
        
        # Add agent to project team
        if agent_id not in project.team:
            project.add_team_member(agent_id)
        
        self.save_data()
        logger.info(f"Assigned agent '{agent['name']}' to project '{project.title}'")
        return True
    
    def remove_agent_from_project(self, agent_id: str, project_id: str) -> bool:
        """Remove an agent from a project."""
        agent = self.agents.get(agent_id)
        project = self.projects.get(project_id)
        
        if not agent or not project:
            return False
        
        # Remove project from agent's current projects
        if project_id in agent.get("current_projects", []):
            agent["current_projects"].remove(project_id)
            agent["updated_at"] = datetime.now().isoformat()
        
        # Remove agent from project team
        if agent_id in project.team:
            project.remove_team_member(agent_id)
        
        self.save_data()
        logger.info(f"Removed agent '{agent['name']}' from project '{project.title}'")
        return True
    
    def assign_task(self, project_id: str, task_id: str, agent_id: str) -> bool:
        """Assign a task to an agent."""
        project = self.projects.get(project_id)
        agent = self.agents.get(agent_id)
        
        if not project or not agent:
            return False
        
        task = project.get_task(task_id)
        if not task:
            return False
        
        # Add agent to task's assigned agents
        if agent_id not in task.assigned_agents:
            task.assigned_agents.append(agent_id)
            task.updated_at = datetime.now()
            project.updated_at = datetime.now()
        
        # Make sure agent is part of the project team
        if agent_id not in project.team:
            project.add_team_member(agent_id)
        
        # Add project to agent's current projects
        if project_id not in agent.get("current_projects", []):
            if "current_projects" not in agent:
                agent["current_projects"] = []
            agent["current_projects"].append(project_id)
            agent["updated_at"] = datetime.now().isoformat()
        
        self.save_data()
        logger.info(f"Assigned task '{task.title}' to agent '{agent['name']}'")
        return True
    
    def unassign_task(self, project_id: str, task_id: str, agent_id: str) -> bool:
        """Unassign a task from an agent."""
        project = self.projects.get(project_id)
        
        if not project:
            return False
        
        task = project.get_task(task_id)
        if not task:
            return False
        
        # Remove agent from task's assigned agents
        if agent_id in task.assigned_agents:
            task.assigned_agents.remove(agent_id)
            task.updated_at = datetime.now()
            project.updated_at = datetime.now()
            
            self.save_data()
            logger.info(f"Unassigned task '{task.title}' from agent {agent_id}")
            return True
        
        return False
    
    def find_available_agents(self, required_capabilities: List[str] = None, 
                             required_skills: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """Find agents that match the given requirements."""
        available_agents = []
        
        for agent_id, agent in self.agents.items():
            if agent.get("status") != "available":
                continue
            
            # Check capabilities
            if required_capabilities:
                agent_capabilities = set(agent.get("capabilities", []))
                if not all(cap in agent_capabilities for cap in required_capabilities):
                    continue
            
            # Check skills
            if required_skills:
                agent_skills = agent.get("skills", {})
                if not all(agent_skills.get(skill, 0) >= level for skill, level in required_skills.items()):
                    continue
            
            # This agent matches the requirements
            available_agents.append(agent)
        
        return available_agents
    
    def generate_project_plan(self, project_id: str, goal_description: str, deadline: datetime = None) -> bool:
        """
        Generate a project plan based on a goal description.
        This would typically invoke an LLM to create tasks and estimates.
        
        Args:
            project_id: ID of the project to plan
            goal_description: Description of the project goal
            deadline: Target completion date
            
        Returns:
            True if plan was generated successfully, False otherwise
        """
        project = self.projects.get(project_id)
        if not project:
            return False
        
        # In a real implementation, this would use an LLM to analyze the goal
        # and break it down into tasks. For this implementation, we'll create
        # a simple set of placeholder tasks.
        
        # Reset existing tasks
        project.tasks = {}
        
        # Example task creation
        planning_task = project.add_task(
            title="Project Planning",
            description="Define the scope, objectives, and success criteria",
            status=GoalStatus.COMPLETED,
            priority=GoalPriority.HIGH,
            estimated_hours=2.0
        )
        planning_task.progress = 100
        planning_task.completed_at = datetime.now()
        
        research_task = project.add_task(
            title="Research & Analysis",
            description="Gather information and analyze requirements",
            status=GoalStatus.IN_PROGRESS,
            priority=GoalPriority.HIGH,
            estimated_hours=8.0,
            dependencies=[planning_task.task_id]
        )
        research_task.progress = 50
        
        design_task = project.add_task(
            title="Design & Planning",
            description="Create detailed designs and implementation plans",
            status=GoalStatus.READY,
            priority=GoalPriority.MEDIUM,
            estimated_hours=10.0,
            dependencies=[research_task.task_id]
        )
        
        implementation_task = project.add_task(
            title="Implementation",
            description="Build and implement the solution",
            status=GoalStatus.READY,
            priority=GoalPriority.MEDIUM,
            estimated_hours=20.0,
            dependencies=[design_task.task_id]
        )
        
        testing_task = project.add_task(
            title="Testing & QA",
            description="Verify the solution meets requirements",
            status=GoalStatus.READY,
            priority=GoalPriority.MEDIUM,
            estimated_hours=8.0,
            dependencies=[implementation_task.task_id]
        )
        
        deployment_task = project.add_task(
            title="Deployment",
            description="Deploy the solution to production",
            status=GoalStatus.READY,
            priority=GoalPriority.HIGH,
            estimated_hours=4.0,
            dependencies=[testing_task.task_id]
        )
        
        # Update project status and deadline
        project.status = GoalStatus.IN_PROGRESS
        if deadline:
            project.deadline = deadline
        
        # Add a note about the plan generation
        project.add_note(
            f"Generated project plan based on goal: {goal_description}",
            author="system"
        )
        
        self.save_data()
        logger.info(f"Generated plan for project '{project.title}' with {len(project.tasks)} tasks")
        return True
    
    def assign_optimal_team(self, project_id: str) -> List[str]:
        """
        Assign an optimal team to a project based on required skills and availability.
        
        Args:
            project_id: ID of the project to assign a team to
            
        Returns:
            List of assigned agent IDs
        """
        project = self.projects.get(project_id)
        if not project:
            return []
        
        # In a real implementation, this would analyze task requirements
        # and find the optimal team. For this implementation, we'll 
        # simply assign available agents with capabilities that match
        # the project title or tags.
        
        # Extract keywords from project title and tags
        keywords = set(project.title.lower().split() + project.tags)
        
        # Find agents with matching capabilities
        assigned_agents = []
        for agent_id, agent in self.agents.items():
            if agent.get("status") != "available":
                continue
            
            agent_capabilities = [cap.lower() for cap in agent.get("capabilities", [])]
            
            # Check if any capability matches a keyword
            if any(keyword in cap for keyword in keywords for cap in agent_capabilities):
                # Assign agent to project
                if self.assign_agent_to_project(agent_id, project_id):
                    assigned_agents.append(agent_id)
                    
                    # Limit to 3 agents for this example
                    if len(assigned_agents) >= 3:
                        break
        
        if assigned_agents:
            project.add_note(
                f"Assigned {len(assigned_agents)} agents to the project team",
                author="system"
            )
            self.save_data()
            
        logger.info(f"Assigned {len(assigned_agents)} agents to project '{project.title}'")
        return assigned_agents
    
    def check_task_dependencies(self, project_id: str) -> Dict[str, List[str]]:
        """
        Check for unmet task dependencies in a project.
        
        Args:
            project_id: ID of the project to check
            
        Returns:
            Dictionary mapping task IDs to lists of unmet dependency IDs
        """
        project = self.projects.get(project_id)
        if not project:
            return {}
        
        unmet_dependencies = {}
        
        for task_id, task in project.tasks.items():
            if not task.dependencies:
                continue
            
            # Check each dependency
            unmet = []
            for dep_id in task.dependencies:
                dep_task = project.get_task(dep_id)
                if not dep_task or dep_task.status != GoalStatus.COMPLETED:
                    unmet.append(dep_id)
            
            if unmet:
                unmet_dependencies[task_id] = unmet
        
        return unmet_dependencies
    
    def get_project_timeline(self, project_id: str) -> Dict[str, Any]:
        """
        Generate a timeline for a project based on task dependencies and estimates.
        
        Args:
            project_id: ID of the project to generate a timeline for
            
        Returns:
            Dictionary with timeline data
        """
        project = self.projects.get(project_id)
        if not project:
            return {}
        
        # Get critical path
        critical_path = project.get_critical_path()
        
        # Calculate earliest start and finish times
        earliest_start = {}
        earliest_finish = {}
        
        # Initialize all tasks with earliest start time of 0
        for task_id in project.tasks:
            earliest_start[task_id] = 0
            
        # Calculate earliest start and finish times based on dependencies
        for task_id in critical_path:
            task = project.get_task(task_id)
            if not task:
                continue
                
            # Find the maximum earliest finish time of all dependencies
            max_dep_finish = 0
            for dep_id in task.dependencies:
                if dep_id in earliest_finish:
                    max_dep_finish = max(max_dep_finish, earliest_finish[dep_id])
            
            # Set earliest start time to the maximum finish time of dependencies
            earliest_start[task_id] = max_dep_finish
            
            # Calculate earliest finish time by adding the task duration
            earliest_finish[task_id] = earliest_start[task_id] + task.estimated_hours
        
        # Find the total project duration
        total_duration = max(earliest_finish.values()) if earliest_finish else 0
        
        # Create the timeline data
        timeline = {
            "project_id": project_id,
            "project_title": project.title,
            "total_duration": total_duration,
            "critical_path": critical_path,
            "tasks": {}
        }
        
        # Add task timeline data
        for task_id, task in project.tasks.items():
            timeline["tasks"][task_id] = {
                "title": task.title,
                "earliest_start": earliest_start.get(task_id, 0),
                "earliest_finish": earliest_finish.get(task_id, 0),
                "duration": task.estimated_hours,
                "progress": task.progress,
                "status": task.status.value,
                "assigned_agents": task.assigned_agents
            }
        
        return timeline
    
    def get_agent_workload(self, agent_id: str) -> Dict[str, Any]:
        """
        Get the current workload for an agent.
        
        Args:
            agent_id: ID of the agent to check
            
        Returns:
            Dictionary with workload data
        """
        agent = self.agents.get(agent_id)
        if not agent:
            return {}
        
        workload = {
            "agent_id": agent_id,
            "name": agent.get("name", "Unknown"),
            "total_tasks": 0,
            "total_hours": 0,
            "projects": {}
        }
        
        # Calculate workload across all assigned projects
        for project_id in agent.get("current_projects", []):
            project = self.projects.get(project_id)
            if not project:
                continue
                
            project_tasks = []
            project_hours = 0
            
            for task_id, task in project.tasks.items():
                if agent_id in task.assigned_agents:
                    # Only count incomplete tasks
                    if task.status != GoalStatus.COMPLETED:
                        project_tasks.append({
                            "task_id": task_id,
                            "title": task.title,
                            "status": task.status.value,
                            "hours": task.estimated_hours,
                            "progress": task.progress
                        })
                        project_hours += task.estimated_hours
                        workload["total_tasks"] += 1
                        workload["total_hours"] += task.estimated_hours
            
            workload["projects"][project_id] = {
                "title": project.title,
                "tasks": project_tasks,
                "total_hours": project_hours
            }
        
        return workload

# For testing
if __name__ == "__main__":
    # Create a goal planning system
    gps = GoalPlanningSystem()
    
    # Register some test agents
    gps.register_agent(
        agent_id="agent1",
        name="Research Agent",
        capabilities=["research", "analysis", "data_collection"],
        skills={"research": 0.9, "writing": 0.7, "analysis": 0.8}
    )
    
    gps.register_agent(
        agent_id="agent2",
        name="Development Agent",
        capabilities=["coding", "development", "testing"],
        skills={"coding": 0.9, "testing": 0.8, "problem_solving": 0.8}
    )
    
    gps.register_agent(
        agent_id="agent3",
        name="Design Agent",
        capabilities=["design", "ux", "visual"],
        skills={"design": 0.9, "creativity": 0.8, "aesthetics": 0.9}
    )
    
    # Create a test project
    project = gps.create_project(
        title="Website Redesign",
        description="Redesign the company website to improve user experience and conversion rates",
        goal="Increase conversion rate by 20% within 3 months",
        category=GoalCategory.PROFESSIONAL,
        priority=GoalPriority.HIGH,
        deadline=datetime.now() + timedelta(days=90),
        tags=["website", "ux", "design"]
    )
    
    # Generate a project plan
    gps.generate_project_plan(
        project_id=project.project_id,
        goal_description="Redesign the website to be more user-friendly and improve conversion rates",
        deadline=datetime.now() + timedelta(days=90)
    )
    
    # Assign an optimal team
    assigned_agents = gps.assign_optimal_team(project.project_id)
    print(f"Assigned agents: {', '.join(assigned_agents)}")
    
    # Get the project timeline
    timeline = gps.get_project_timeline(project.project_id)
    print(f"Project timeline: {timeline['total_duration']} hours total duration")
    
    # Get an agent's workload
    if assigned_agents:
        workload = gps.get_agent_workload(assigned_agents[0])
        print(f"Agent workload: {workload['total_tasks']} tasks, {workload['total_hours']} hours")