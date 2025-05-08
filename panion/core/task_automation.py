"""
Task Automation Module
Provides functionality to schedule and automate tasks.
"""

import os
import json
import time
import logging
import threading
import importlib
import inspect
import random
import string
from typing import List, Dict, Any, Optional, Union, Tuple, Callable
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Status of a scheduled task."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class TaskPriority(Enum):
    """Priority level for tasks."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskRepeatType(Enum):
    """Types of task repetition."""
    NONE = "none"           # One-time task
    DAILY = "daily"         # Repeat daily
    WEEKLY = "weekly"       # Repeat weekly
    MONTHLY = "monthly"     # Repeat monthly
    INTERVAL = "interval"   # Repeat at a specific interval

class Task:
    """Represents a scheduled task."""
    
    def __init__(self, 
                task_id: str,
                name: str,
                action: Dict[str, Any],
                schedule_time: datetime,
                priority: TaskPriority = TaskPriority.MEDIUM,
                repeat_type: TaskRepeatType = TaskRepeatType.NONE,
                repeat_interval: Optional[int] = None,
                max_retries: int = 3,
                description: str = "",
                tags: List[str] = None):
        """
        Initialize a task.
        
        Args:
            task_id: Unique identifier for the task
            name: Name of the task
            action: Dictionary containing action details (type, function, args, etc.)
            schedule_time: When to execute the task
            priority: Task priority level
            repeat_type: How the task should repeat
            repeat_interval: Interval for repeated tasks (in appropriate units)
            max_retries: Maximum number of retry attempts on failure
            description: Detailed description of the task
            tags: List of tags for categorization
        """
        self.task_id = task_id
        self.name = name
        self.action = action
        self.schedule_time = schedule_time
        self.priority = priority
        self.repeat_type = repeat_type
        self.repeat_interval = repeat_interval
        self.max_retries = max_retries
        self.description = description
        self.tags = tags or []
        
        # Runtime attributes
        self.status = TaskStatus.PENDING
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.last_run = None
        self.next_run = schedule_time
        self.run_count = 0
        self.retry_count = 0
        self.results = []
        self.error_message = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the task to a dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "name": self.name,
            "action": self.action,
            "schedule_time": self.schedule_time.isoformat(),
            "priority": self.priority.value,
            "repeat_type": self.repeat_type.value,
            "repeat_interval": self.repeat_interval,
            "max_retries": self.max_retries,
            "description": self.description,
            "tags": self.tags,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "run_count": self.run_count,
            "retry_count": self.retry_count,
            "results": self.results,
            "error_message": self.error_message
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create a Task instance from a dictionary."""
        task = cls(
            task_id=data["task_id"],
            name=data["name"],
            action=data["action"],
            schedule_time=datetime.fromisoformat(data["schedule_time"]),
            priority=TaskPriority(data["priority"]),
            repeat_type=TaskRepeatType(data["repeat_type"]),
            repeat_interval=data.get("repeat_interval"),
            max_retries=data.get("max_retries", 3),
            description=data.get("description", ""),
            tags=data.get("tags", [])
        )
        
        # Set runtime attributes
        task.status = TaskStatus(data["status"])
        task.created_at = datetime.fromisoformat(data["created_at"])
        task.updated_at = datetime.fromisoformat(data["updated_at"])
        task.last_run = datetime.fromisoformat(data["last_run"]) if data.get("last_run") else None
        task.next_run = datetime.fromisoformat(data["next_run"]) if data.get("next_run") else None
        task.run_count = data.get("run_count", 0)
        task.retry_count = data.get("retry_count", 0)
        task.results = data.get("results", [])
        task.error_message = data.get("error_message")
        
        return task
    
    def update_next_run(self):
        """Update the next run time based on repeat settings."""
        if self.repeat_type == TaskRepeatType.NONE:
            self.next_run = None
            return
        
        # Use last_run as the base time, or schedule_time if never run
        base_time = self.last_run if self.last_run else self.schedule_time
        
        if self.repeat_type == TaskRepeatType.DAILY:
            self.next_run = base_time + timedelta(days=1)
        elif self.repeat_type == TaskRepeatType.WEEKLY:
            self.next_run = base_time + timedelta(weeks=1)
        elif self.repeat_type == TaskRepeatType.MONTHLY:
            # Add approximately one month
            year = base_time.year + ((base_time.month + 1) // 12)
            month = ((base_time.month + 1) % 12) or 12
            day = min(base_time.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 
                                     31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
            self.next_run = base_time.replace(year=year, month=month, day=day)
        elif self.repeat_type == TaskRepeatType.INTERVAL:
            if self.repeat_interval:
                self.next_run = base_time + timedelta(seconds=self.repeat_interval)
            else:
                # Default to daily if no interval specified
                self.next_run = base_time + timedelta(days=1)

class TaskAutomationManager:
    """Manages the scheduling and execution of automated tasks."""
    
    def __init__(self):
        """Initialize the task automation manager."""
        self.tasks = {}  # Dictionary mapping task_id to Task objects
        self.data_dir = "./data/tasks"
        self.scheduler_running = False
        self.scheduler_thread = None
        self.tasks_file = os.path.join(self.data_dir, "tasks.json")
        
        # Create data directory if it doesn't exist
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load existing tasks
        self.load_tasks()
        
        # Register available action handlers
        self.action_handlers = {
            "function": self._execute_function,
            "http_request": self._execute_http_request,
            "shell_command": self._execute_shell_command,
            "python_script": self._execute_python_script,
            "data_processing": self._execute_data_processing
        }
    
    def load_tasks(self):
        """Load tasks from the tasks file."""
        if os.path.exists(self.tasks_file):
            try:
                with open(self.tasks_file, 'r') as f:
                    tasks_data = json.load(f)
                
                for task_data in tasks_data:
                    task = Task.from_dict(task_data)
                    self.tasks[task.task_id] = task
                
                logger.info(f"Loaded {len(self.tasks)} tasks")
            except Exception as e:
                logger.error(f"Error loading tasks: {str(e)}")
    
    def save_tasks(self):
        """Save tasks to the tasks file."""
        try:
            tasks_data = [task.to_dict() for task in self.tasks.values()]
            with open(self.tasks_file, 'w') as f:
                json.dump(tasks_data, f, indent=2)
            
            logger.info(f"Saved {len(self.tasks)} tasks")
        except Exception as e:
            logger.error(f"Error saving tasks: {str(e)}")
    
    def create_task(self, 
                   name: str,
                   action: Dict[str, Any],
                   schedule_time: datetime = None,
                   priority: Union[TaskPriority, str] = TaskPriority.MEDIUM,
                   repeat_type: Union[TaskRepeatType, str] = TaskRepeatType.NONE,
                   repeat_interval: Optional[int] = None,
                   max_retries: int = 3,
                   description: str = "",
                   tags: List[str] = None) -> Task:
        """
        Create a new task.
        
        Args:
            name: Name of the task
            action: Dictionary containing action details
            schedule_time: When to execute the task (defaults to now if None)
            priority: Task priority level
            repeat_type: How the task should repeat
            repeat_interval: Interval for repeated tasks
            max_retries: Maximum number of retry attempts on failure
            description: Detailed description of the task
            tags: List of tags for categorization
            
        Returns:
            Created Task object
        """
        # Generate a unique task ID
        task_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
        
        # Set default schedule time to now if not provided
        if schedule_time is None:
            schedule_time = datetime.now()
        
        # Convert string enums to enum objects if needed
        if isinstance(priority, str):
            priority = TaskPriority(priority)
        
        if isinstance(repeat_type, str):
            repeat_type = TaskRepeatType(repeat_type)
        
        # Create the task
        task = Task(
            task_id=task_id,
            name=name,
            action=action,
            schedule_time=schedule_time,
            priority=priority,
            repeat_type=repeat_type,
            repeat_interval=repeat_interval,
            max_retries=max_retries,
            description=description,
            tags=tags
        )
        
        # Add to the tasks dictionary
        self.tasks[task_id] = task
        
        # Save tasks to disk
        self.save_tasks()
        
        logger.info(f"Created task '{name}' with ID {task_id}")
        return task
    
    def update_task(self, task_id: str, **kwargs) -> Optional[Task]:
        """
        Update an existing task.
        
        Args:
            task_id: ID of the task to update
            **kwargs: Task attributes to update
            
        Returns:
            Updated Task object, or None if task not found
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found")
            return None
        
        # Update the task attributes
        for key, value in kwargs.items():
            if key == "priority" and isinstance(value, str):
                value = TaskPriority(value)
            elif key == "repeat_type" and isinstance(value, str):
                value = TaskRepeatType(value)
            elif key == "schedule_time" and isinstance(value, str):
                value = datetime.fromisoformat(value)
            
            if hasattr(task, key):
                setattr(task, key, value)
        
        # Update the 'updated_at' timestamp
        task.updated_at = datetime.now()
        
        # Save tasks to disk
        self.save_tasks()
        
        logger.info(f"Updated task '{task.name}' (ID: {task_id})")
        return task
    
    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task.
        
        Args:
            task_id: ID of the task to delete
            
        Returns:
            True if the task was deleted, False otherwise
        """
        if task_id in self.tasks:
            task = self.tasks[task_id]
            del self.tasks[task_id]
            
            # Save tasks to disk
            self.save_tasks()
            
            logger.info(f"Deleted task '{task.name}' (ID: {task_id})")
            return True
        else:
            logger.warning(f"Task with ID {task_id} not found")
            return False
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task to get
            
        Returns:
            Task object, or None if not found
        """
        return self.tasks.get(task_id)
    
    def list_tasks(self, status: Union[TaskStatus, str] = None, 
                  priority: Union[TaskPriority, str] = None,
                  tag: str = None,
                  limit: int = None,
                  sort_by: str = "next_run") -> List[Dict[str, Any]]:
        """
        List tasks with optional filtering and sorting.
        
        Args:
            status: Filter by task status
            priority: Filter by task priority
            tag: Filter by tag
            limit: Maximum number of tasks to return
            sort_by: Field to sort by
            
        Returns:
            List of task dictionaries
        """
        # Convert string enums to enum objects if needed
        if isinstance(status, str) and status:
            status = TaskStatus(status)
        
        if isinstance(priority, str) and priority:
            priority = TaskPriority(priority)
        
        # Filter tasks
        filtered_tasks = list(self.tasks.values())
        
        if status:
            filtered_tasks = [task for task in filtered_tasks if task.status == status]
        
        if priority:
            filtered_tasks = [task for task in filtered_tasks if task.priority == priority]
        
        if tag:
            filtered_tasks = [task for task in filtered_tasks if tag in task.tags]
        
        # Sort tasks
        if sort_by == "next_run":
            # Sort by next_run, putting None values at the end
            filtered_tasks.sort(key=lambda t: (t.next_run is None, t.next_run))
        elif sort_by == "priority":
            # Sort by priority (critical first)
            priority_order = {
                TaskPriority.CRITICAL: 0,
                TaskPriority.HIGH: 1,
                TaskPriority.MEDIUM: 2,
                TaskPriority.LOW: 3
            }
            filtered_tasks.sort(key=lambda t: priority_order[t.priority])
        elif sort_by == "created_at":
            # Sort by creation time (newest first)
            filtered_tasks.sort(key=lambda t: t.created_at, reverse=True)
        
        # Apply limit
        if limit:
            filtered_tasks = filtered_tasks[:limit]
        
        # Convert to dictionaries
        return [task.to_dict() for task in filtered_tasks]
    
    def start_scheduler(self):
        """Start the task scheduler."""
        if self.scheduler_running:
            logger.warning("Task scheduler is already running")
            return
        
        self.scheduler_running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop)
        self.scheduler_thread.daemon = True
        self.scheduler_thread.start()
        
        logger.info("Task scheduler started")
    
    def stop_scheduler(self):
        """Stop the task scheduler."""
        if not self.scheduler_running:
            logger.warning("Task scheduler is not running")
            return
        
        self.scheduler_running = False
        if self.scheduler_thread and self.scheduler_thread.is_alive():
            self.scheduler_thread.join(timeout=5)
        
        logger.info("Task scheduler stopped")
    
    def _scheduler_loop(self):
        """Main loop for the task scheduler."""
        while self.scheduler_running:
            try:
                now = datetime.now()
                
                # Find tasks that need to be executed
                for task_id, task in list(self.tasks.items()):
                    if (task.status == TaskStatus.PENDING and 
                        task.next_run and 
                        task.next_run <= now):
                        # Execute the task in a separate thread
                        threading.Thread(target=self._execute_task, args=(task_id,)).start()
                
                # Sleep for a short interval before checking again
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in scheduler loop: {str(e)}")
                time.sleep(5)  # Wait a bit longer after an error
    
    def _execute_task(self, task_id: str):
        """
        Execute a task.
        
        Args:
            task_id: ID of the task to execute
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found")
            return
        
        # Update task status and timestamps
        task.status = TaskStatus.RUNNING
        task.last_run = datetime.now()
        task.run_count += 1
        self.save_tasks()
        
        logger.info(f"Executing task '{task.name}' (ID: {task_id})")
        
        try:
            # Get the appropriate action handler
            action_type = task.action.get("type")
            handler = self.action_handlers.get(action_type)
            
            if not handler:
                raise ValueError(f"Unsupported action type: {action_type}")
            
            # Execute the action
            result = handler(task.action)
            
            # Update task with result
            task.results.append({
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "result": result
            })
            task.status = TaskStatus.COMPLETED
            task.error_message = None
            task.retry_count = 0
            
            # Update next run time for repeating tasks
            if task.repeat_type != TaskRepeatType.NONE:
                task.update_next_run()
                task.status = TaskStatus.PENDING
            
        except Exception as e:
            logger.error(f"Error executing task '{task.name}' (ID: {task_id}): {str(e)}")
            
            # Update task with error
            task.results.append({
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "error": str(e)
            })
            
            # Retry logic
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.status = TaskStatus.PENDING
                task.next_run = datetime.now() + timedelta(minutes=2 ** task.retry_count)  # Exponential backoff
                task.error_message = f"Retry {task.retry_count}/{task.max_retries}: {str(e)}"
            else:
                task.status = TaskStatus.FAILED
                task.error_message = str(e)
        
        # Save tasks to disk
        task.updated_at = datetime.now()
        self.save_tasks()
    
    def run_task_now(self, task_id: str) -> bool:
        """
        Run a task immediately.
        
        Args:
            task_id: ID of the task to run
            
        Returns:
            True if the task was started, False otherwise
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found")
            return False
        
        if task.status == TaskStatus.RUNNING:
            logger.warning(f"Task '{task.name}' (ID: {task_id}) is already running")
            return False
        
        # Set the task to pending and update next_run to now
        task.status = TaskStatus.PENDING
        task.next_run = datetime.now()
        self.save_tasks()
        
        logger.info(f"Scheduled task '{task.name}' (ID: {task_id}) to run immediately")
        return True
    
    def pause_task(self, task_id: str) -> bool:
        """
        Pause a task.
        
        Args:
            task_id: ID of the task to pause
            
        Returns:
            True if the task was paused, False otherwise
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found")
            return False
        
        if task.status == TaskStatus.RUNNING:
            logger.warning(f"Cannot pause running task '{task.name}' (ID: {task_id})")
            return False
        
        task.status = TaskStatus.PAUSED
        task.updated_at = datetime.now()
        self.save_tasks()
        
        logger.info(f"Paused task '{task.name}' (ID: {task_id})")
        return True
    
    def resume_task(self, task_id: str) -> bool:
        """
        Resume a paused task.
        
        Args:
            task_id: ID of the task to resume
            
        Returns:
            True if the task was resumed, False otherwise
        """
        task = self.tasks.get(task_id)
        if not task:
            logger.warning(f"Task with ID {task_id} not found")
            return False
        
        if task.status != TaskStatus.PAUSED:
            logger.warning(f"Task '{task.name}' (ID: {task_id}) is not paused")
            return False
        
        task.status = TaskStatus.PENDING
        task.updated_at = datetime.now()
        
        # If the task should have already run, schedule it to run soon
        if task.next_run and task.next_run < datetime.now():
            task.next_run = datetime.now() + timedelta(minutes=1)
        
        self.save_tasks()
        
        logger.info(f"Resumed task '{task.name}' (ID: {task_id})")
        return True
    
    # Action handlers
    
    def _execute_function(self, action: Dict[str, Any]) -> Any:
        """
        Execute a Python function.
        
        Args:
            action: Action dictionary with function details
            
        Returns:
            Function result
        """
        module_name = action.get("module")
        function_name = action.get("function")
        args = action.get("args", [])
        kwargs = action.get("kwargs", {})
        
        if not module_name or not function_name:
            raise ValueError("Module and function names are required")
        
        try:
            # Import the module
            module = importlib.import_module(module_name)
            
            # Get the function
            function = getattr(module, function_name)
            
            # Call the function
            return function(*args, **kwargs)
            
        except ImportError:
            raise ValueError(f"Module '{module_name}' not found")
        except AttributeError:
            raise ValueError(f"Function '{function_name}' not found in module '{module_name}'")
    
    def _execute_http_request(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an HTTP request.
        
        Args:
            action: Action dictionary with request details
            
        Returns:
            Dictionary with response details
        """
        import requests
        
        url = action.get("url")
        method = action.get("method", "GET").upper()
        headers = action.get("headers", {})
        params = action.get("params", {})
        data = action.get("data")
        json_data = action.get("json")
        timeout = action.get("timeout", 30)
        
        if not url:
            raise ValueError("URL is required")
        
        # Make the request
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            data=data,
            json=json_data,
            timeout=timeout
        )
        
        # Raise an exception for 4XX/5XX responses
        response.raise_for_status()
        
        # Try to parse JSON response
        try:
            response_json = response.json()
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "json": response_json
            }
        except:
            # Return text response if not JSON
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "text": response.text
            }
    
    def _execute_shell_command(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a shell command.
        
        Args:
            action: Action dictionary with command details
            
        Returns:
            Dictionary with command output
        """
        import subprocess
        
        command = action.get("command")
        shell = action.get("shell", True)
        cwd = action.get("cwd")
        env = action.get("env")
        timeout = action.get("timeout")
        
        if not command:
            raise ValueError("Command is required")
        
        # Execute the command
        process = subprocess.run(
            command,
            shell=shell,
            cwd=cwd,
            env=env,
            timeout=timeout,
            capture_output=True,
            text=True
        )
        
        return {
            "returncode": process.returncode,
            "stdout": process.stdout,
            "stderr": process.stderr,
            "success": process.returncode == 0
        }
    
    def _execute_python_script(self, action: Dict[str, Any]) -> Any:
        """
        Execute a Python script.
        
        Args:
            action: Action dictionary with script details
            
        Returns:
            Script result
        """
        script_code = action.get("code")
        script_path = action.get("path")
        script_args = action.get("args", {})
        
        if script_code and script_path:
            raise ValueError("Cannot specify both code and path")
        
        if script_code:
            # Execute code string
            local_vars = {"result": None}
            exec(script_code, {"__builtins__": __builtins__, **script_args}, local_vars)
            return local_vars.get("result")
            
        elif script_path:
            # Execute script file
            script_globals = {"__file__": script_path, "__name__": "__main__", **script_args}
            with open(script_path, 'r') as f:
                script_code = f.read()
            exec(script_code, script_globals)
            return script_globals.get("result")
            
        else:
            raise ValueError("Either code or path must be specified")
    
    def _execute_data_processing(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a data processing action.
        
        Args:
            action: Action dictionary with processing details
            
        Returns:
            Processing results
        """
        import pandas as pd
        
        operation = action.get("operation")
        input_path = action.get("input_path")
        output_path = action.get("output_path")
        
        if not operation or not input_path:
            raise ValueError("Operation and input_path are required")
        
        # Load the input data
        if input_path.endswith('.csv'):
            df = pd.read_csv(input_path)
        elif input_path.endswith('.json'):
            df = pd.read_json(input_path)
        elif input_path.endswith('.xlsx'):
            df = pd.read_excel(input_path)
        else:
            raise ValueError(f"Unsupported file format: {input_path}")
        
        # Process the data based on the operation
        if operation == "filter":
            # Filter rows based on a condition
            column = action.get("column")
            condition = action.get("condition")
            value = action.get("value")
            
            if not column or not condition:
                raise ValueError("Column and condition are required for filter operation")
            
            if condition == "equals":
                result_df = df[df[column] == value]
            elif condition == "not_equals":
                result_df = df[df[column] != value]
            elif condition == "greater_than":
                result_df = df[df[column] > value]
            elif condition == "less_than":
                result_df = df[df[column] < value]
            elif condition == "contains":
                result_df = df[df[column].astype(str).str.contains(value)]
            else:
                raise ValueError(f"Unsupported condition: {condition}")
                
        elif operation == "aggregate":
            # Aggregate data
            group_by = action.get("group_by")
            agg_column = action.get("agg_column")
            agg_function = action.get("agg_function")
            
            if not group_by or not agg_column or not agg_function:
                raise ValueError("group_by, agg_column, and agg_function are required for aggregate operation")
            
            result_df = df.groupby(group_by)[agg_column].agg(agg_function).reset_index()
            
        elif operation == "sort":
            # Sort data
            sort_by = action.get("sort_by")
            ascending = action.get("ascending", True)
            
            if not sort_by:
                raise ValueError("sort_by is required for sort operation")
            
            result_df = df.sort_values(sort_by, ascending=ascending)
            
        elif operation == "transform":
            # Transform a column
            column = action.get("column")
            transform = action.get("transform")
            new_column = action.get("new_column", column)
            
            if not column or not transform:
                raise ValueError("column and transform are required for transform operation")
            
            if transform == "upper":
                df[new_column] = df[column].astype(str).str.upper()
            elif transform == "lower":
                df[new_column] = df[column].astype(str).str.lower()
            elif transform == "strip":
                df[new_column] = df[column].astype(str).str.strip()
            elif transform == "capitalize":
                df[new_column] = df[column].astype(str).str.capitalize()
            else:
                raise ValueError(f"Unsupported transform: {transform}")
            
            result_df = df
            
        else:
            raise ValueError(f"Unsupported operation: {operation}")
        
        # Save the result if output_path is specified
        if output_path:
            if output_path.endswith('.csv'):
                result_df.to_csv(output_path, index=False)
            elif output_path.endswith('.json'):
                result_df.to_json(output_path, orient='records')
            elif output_path.endswith('.xlsx'):
                result_df.to_excel(output_path, index=False)
            else:
                raise ValueError(f"Unsupported output format: {output_path}")
        
        # Return a summary of the results
        return {
            "row_count": len(result_df),
            "column_count": len(result_df.columns),
            "columns": result_df.columns.tolist(),
            "output_path": output_path
        }

# For testing
if __name__ == "__main__":
    # Create a task automation manager
    manager = TaskAutomationManager()
    
    # Create a simple test task that prints a message
    task = manager.create_task(
        name="Test Task",
        action={
            "type": "python_script",
            "code": "import time; print('Task executed at', time.ctime()); result = 'Task completed'"
        },
        schedule_time=datetime.now() + timedelta(seconds=5),
        description="A simple test task",
        tags=["test", "example"]
    )
    
    print(f"Created task: {task.task_id}")
    
    # Start the scheduler
    manager.start_scheduler()
    
    try:
        # Wait for the task to execute
        time.sleep(10)
        
        # Check the task status
        updated_task = manager.get_task(task.task_id)
        print(f"Task status: {updated_task.status.value}")
        print(f"Task results: {updated_task.results}")
        
    finally:
        # Stop the scheduler
        manager.stop_scheduler()