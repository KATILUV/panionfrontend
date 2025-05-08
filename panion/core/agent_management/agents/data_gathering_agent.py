"""
Data Gathering Agent
Agent specialized in collecting structured data from various sources
and formatting it according to user requirements.
"""

import os
import sys
import json
import time
import logging
import threading
import datetime
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataGatheringAgent:
    """
    Agent responsible for gathering structured data from various sources.
    This agent works autonomously to collect, clean, and organize information.
    """
    
    def __init__(self, name="Data Gathering Agent"):
        self.name = name
        self.active_tasks = {}
        self.completed_tasks = {}
        self.task_threads = {}
        self.persistence_enabled = True
        
    def create_task(self, task_id: str, task_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new data gathering task.
        
        Args:
            task_id: Unique identifier for the task
            task_details: Details of the task including parameters, location, etc.
            
        Returns:
            Dict with task status information
        """
        logger.info(f"Creating new data gathering task: {task_id}")
        
        if task_id in self.active_tasks or task_id in self.completed_tasks:
            return {
                "status": "error",
                "message": f"Task with ID {task_id} already exists",
                "task_id": task_id
            }
        
        # Default parameters
        task_parameters = {
            "location": "New York",
            "business_type": "smoke shop",
            "limit": 20,
            "persistence": True,
            "format": "json",
            "notification": True,
            "deadline": None,
            "priority": "normal"
        }
        
        # Update with provided parameters
        if "parameters" in task_details:
            task_parameters.update(task_details["parameters"])
        
        # Create task object
        self.active_tasks[task_id] = {
            "id": task_id,
            "status": "created",
            "parameters": task_parameters,
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "progress": 0,
            "result_path": None,
            "error": None,
            "messages": [
                {
                    "time": datetime.datetime.now().isoformat(),
                    "content": f"Task created: {task_details.get('goal', 'Data gathering task')}"
                }
            ]
        }
        
        # Start task in background thread if persistence is enabled
        if task_parameters["persistence"]:
            thread = threading.Thread(
                target=self._execute_task_thread,
                args=(task_id,),
                daemon=True
            )
            self.task_threads[task_id] = thread
            thread.start()
            logger.info(f"Started background thread for task {task_id}")
        
        return {
            "status": "created",
            "message": f"Task {task_id} created successfully",
            "task_id": task_id,
            "estimated_time": self._estimate_completion_time(task_parameters)
        }
    
    def _estimate_completion_time(self, parameters: Dict[str, Any]) -> str:
        """
        Estimate how long a task will take based on its parameters.
        
        Args:
            parameters: Task parameters
            
        Returns:
            Human-readable time estimate
        """
        # Base time for initialization
        base_minutes = 2
        
        # Add time based on data volume
        limit = parameters.get("limit", 20)
        limit_factor = limit / 10  # 10 items is our reference point
        
        # Each source adds time
        source_count = 2  # Default: Yelp and Google Maps
        if parameters.get("use_multiple_sources", True):
            source_count = 3  # Add another source
        
        # Calculate total estimated minutes
        total_minutes = base_minutes + (limit_factor * 3 * source_count)
        
        # Format the time estimate
        if total_minutes < 60:
            return f"approximately {int(total_minutes)} minutes"
        else:
            hours = int(total_minutes / 60)
            remaining_minutes = int(total_minutes % 60)
            if remaining_minutes == 0:
                return f"approximately {hours} hours"
            else:
                return f"approximately {hours} hours and {remaining_minutes} minutes"
    
    def _execute_task_thread(self, task_id: str):
        """
        Execute a data gathering task in a background thread.
        
        Args:
            task_id: ID of the task to execute
        """
        if task_id not in self.active_tasks:
            logger.error(f"Task {task_id} not found in active tasks")
            return
        
        task = self.active_tasks[task_id]
        parameters = task["parameters"]
        
        try:
            # Update task status
            self._update_task_status(task_id, "running", "Task execution started")
            
            # Import the appropriate scraper based on business type
            if parameters["business_type"].lower() in ["smoke shop", "smokeshop", "smoke"]:
                try:
                    from panion.scrapers.smokeshop_scraper import SmokeshopScraper
                    scraper = SmokeshopScraper()
                    logger.info(f"Using SmokeshopScraper for task {task_id}")
                except ImportError:
                    logger.error(f"Failed to import SmokeshopScraper, falling back to generic")
                    try:
                        from panion.scrapers.enhanced_scraper import EnhancedScraper
                        scraper = EnhancedScraper()
                    except ImportError:
                        self._update_task_status(
                            task_id, 
                            "error", 
                            "Failed to import any scraper module"
                        )
                        return
            else:
                # For other business types, use the enhanced scraper if available
                try:
                    from panion.scrapers.enhanced_scraper import EnhancedScraper
                    scraper = EnhancedScraper()
                except ImportError:
                    self._update_task_status(
                        task_id, 
                        "error", 
                        "Enhanced scraper not available for this business type"
                    )
                    return
            
            # Update progress
            self._update_task_progress(task_id, 10, "Initialized data sources")
            
            # Determine location
            location = parameters.get("location", "New York")
            
            # Determine limit
            limit = parameters.get("limit", 20)
            
            # Execute the scraping
            self._update_task_status(task_id, "running", f"Gathering data from multiple sources for {location}")
            
            # Different methods based on the scraper type
            if hasattr(scraper, "scrape_multiple_sources"):
                results = scraper.scrape_multiple_sources(location=location, limit=limit)
                self._update_task_progress(task_id, 60, f"Data collected from multiple sources")
            elif hasattr(scraper, "scrape_business_directory"):
                results = scraper.scrape_business_directory(
                    business_type=parameters["business_type"],
                    location=location,
                    limit=limit
                )
                self._update_task_progress(task_id, 60, f"Data collected from business directories")
            else:
                self._update_task_status(
                    task_id, 
                    "error", 
                    "Scraper does not have required methods"
                )
                return
            
            # Save the results
            self._update_task_progress(task_id, 80, f"Processing and saving collected data")
            
            # Generate a filename
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            sanitized_location = location.replace(" ", "_").lower()
            business_type = parameters["business_type"].replace(" ", "_").lower()
            filename = f"{business_type}_{sanitized_location}_{timestamp}.json"
            
            # Save to JSON
            if hasattr(scraper, "save_to_json"):
                result_path = scraper.save_to_json(results, filename=filename)
            else:
                # Fallback if scraper doesn't have save method
                result_path = self._save_to_json(results, filename)
            
            # Mark as completed
            self._update_task_progress(task_id, 100, f"Task completed successfully. Found {len(results)} businesses.")
            self.active_tasks[task_id]["result_path"] = result_path
            
            # Move to completed tasks
            self.completed_tasks[task_id] = self.active_tasks[task_id]
            self.completed_tasks[task_id]["status"] = "completed"
            self.completed_tasks[task_id]["completed_at"] = datetime.datetime.now().isoformat()
            del self.active_tasks[task_id]
            
            # Send notification if enabled
            if parameters.get("notification", True):
                self._send_completion_notification(task_id)
            
        except Exception as e:
            logger.error(f"Error executing task {task_id}: {str(e)}")
            self._update_task_status(task_id, "error", f"Task failed: {str(e)}")
    
    def _save_to_json(self, data: List[Dict[str, Any]], filename: str) -> str:
        """
        Fallback method to save data to JSON.
        
        Args:
            data: Data to save
            filename: Target filename
            
        Returns:
            Path to the saved file
        """
        # Ensure the data directory exists
        os.makedirs("./data/scraped", exist_ok=True)
        
        # Full path
        filepath = f"./data/scraped/{filename}"
        
        # Save the data
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Saved {len(data)} records to {filepath}")
        return filepath
    
    def _update_task_status(self, task_id: str, status: str, message: str):
        """
        Update the status of a task.
        
        Args:
            task_id: ID of the task to update
            status: New status
            message: Status message
        """
        if task_id in self.active_tasks:
            self.active_tasks[task_id]["status"] = status
            self.active_tasks[task_id]["updated_at"] = datetime.datetime.now().isoformat()
            self.active_tasks[task_id]["messages"].append({
                "time": datetime.datetime.now().isoformat(),
                "content": message
            })
            logger.info(f"Task {task_id} status updated to {status}: {message}")
    
    def _update_task_progress(self, task_id: str, progress: int, message: str):
        """
        Update the progress of a task.
        
        Args:
            task_id: ID of the task to update
            progress: Progress percentage (0-100)
            message: Progress message
        """
        if task_id in self.active_tasks:
            self.active_tasks[task_id]["progress"] = progress
            self.active_tasks[task_id]["updated_at"] = datetime.datetime.now().isoformat()
            self.active_tasks[task_id]["messages"].append({
                "time": datetime.datetime.now().isoformat(),
                "content": message
            })
            logger.info(f"Task {task_id} progress updated to {progress}%: {message}")
    
    def _send_completion_notification(self, task_id: str):
        """
        Send a notification that a task has completed.
        
        Args:
            task_id: ID of the completed task
        """
        logger.info(f"Task {task_id} completed - would send notification here")
        # In a real implementation, this would send an email, push notification, etc.
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the current status of a task.
        
        Args:
            task_id: ID of the task
            
        Returns:
            Dict with task status information
        """
        # Check active tasks first
        if task_id in self.active_tasks:
            return {
                "status": "active",
                "task_data": self.active_tasks[task_id]
            }
        
        # Then check completed tasks
        if task_id in self.completed_tasks:
            return {
                "status": "completed",
                "task_data": self.completed_tasks[task_id]
            }
        
        # Task not found
        return {
            "status": "error",
            "message": f"Task {task_id} not found"
        }
    
    def cancel_task(self, task_id: str) -> Dict[str, Any]:
        """
        Cancel an active task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            Dict with operation status
        """
        if task_id not in self.active_tasks:
            return {
                "status": "error",
                "message": f"Task {task_id} not found or already completed"
            }
        
        # Mark as cancelled
        self.active_tasks[task_id]["status"] = "cancelled"
        self.active_tasks[task_id]["updated_at"] = datetime.datetime.now().isoformat()
        self.active_tasks[task_id]["messages"].append({
            "time": datetime.datetime.now().isoformat(),
            "content": "Task cancelled by user request"
        })
        
        # Move to completed
        self.completed_tasks[task_id] = self.active_tasks[task_id]
        del self.active_tasks[task_id]
        
        logger.info(f"Task {task_id} cancelled")
        
        return {
            "status": "success",
            "message": f"Task {task_id} cancelled successfully"
        }
    
    def list_tasks(self, status_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        List all tasks, optionally filtered by status.
        
        Args:
            status_filter: Optional filter for task status
            
        Returns:
            Dict with lists of active and completed tasks
        """
        active_tasks = []
        completed_tasks = []
        
        # Process active tasks
        for task_id, task in self.active_tasks.items():
            if not status_filter or task["status"] == status_filter:
                active_tasks.append({
                    "id": task_id,
                    "status": task["status"],
                    "progress": task["progress"],
                    "created_at": task["created_at"],
                    "parameters": {
                        "location": task["parameters"]["location"],
                        "business_type": task["parameters"]["business_type"],
                        "limit": task["parameters"]["limit"],
                    }
                })
        
        # Process completed tasks
        for task_id, task in self.completed_tasks.items():
            if not status_filter or task["status"] == status_filter:
                completed_tasks.append({
                    "id": task_id,
                    "status": task["status"],
                    "progress": task["progress"],
                    "created_at": task["created_at"],
                    "completed_at": task.get("completed_at"),
                    "parameters": {
                        "location": task["parameters"]["location"],
                        "business_type": task["parameters"]["business_type"],
                        "limit": task["parameters"]["limit"],
                    },
                    "result_path": task.get("result_path")
                })
        
        return {
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "total_active": len(active_tasks),
            "total_completed": len(completed_tasks)
        }

# Singleton instance
data_gathering_agent = DataGatheringAgent()