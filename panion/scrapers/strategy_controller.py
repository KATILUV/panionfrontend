"""
Strategy Controller
Integrates the Strategic Orchestrator with the Panion API system.
Provides a simple interface for initiating strategic operations from the API.
"""

import os
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StrategyController:
    """
    Controller for managing and executing strategic operations.
    
    This class serves as a bridge between the Panion API system and 
    the Strategic Orchestrator, providing a simplified interface for
    initiating and monitoring strategic operations.
    """
    
    def __init__(self):
        """Initialize the strategy controller."""
        self.orchestrator = None
        self.results_dir = os.path.join('data', 'results')
        os.makedirs(self.results_dir, exist_ok=True)
        
        # Active operations tracking
        self.active_operations = {}
        self.operation_results = {}
        
    def _init_orchestrator(self) -> None:
        """Initialize the strategic orchestrator if not already initialized."""
        if self.orchestrator is None:
            try:
                # Import here to avoid circular imports
                from panion.core.strategic_orchestrator import StrategicOrchestrator
                self.orchestrator = StrategicOrchestrator()
                logger.info("Strategic orchestrator initialized")
            except ImportError:
                logger.error("Could not import StrategicOrchestrator. Make sure core module is available.")
                raise
    
    async def execute_strategic_goal(self, 
                                  goal: str, 
                                  parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a strategic goal and return the operation ID.
        
        Args:
            goal: The high-level goal to achieve
            parameters: Additional parameters for the goal
            
        Returns:
            Dictionary with operation details
        """
        # Initialize the orchestrator if needed
        self._init_orchestrator()
        
        # Generate a unique operation ID
        operation_id = f"op_{int(datetime.now().timestamp())}"
        
        # Record the operation
        self.active_operations[operation_id] = {
            "goal": goal,
            "parameters": parameters or {},
            "status": "initializing",
            "start_time": datetime.now().isoformat(),
            "progress": 0
        }
        
        # Start the operation in the background
        asyncio.create_task(self._execute_operation(operation_id, goal, parameters or {}))
        
        return {
            "operation_id": operation_id,
            "goal": goal,
            "status": "initializing",
            "message": "Strategic operation initiated"
        }
    
    async def _execute_operation(self, 
                              operation_id: str, 
                              goal: str,
                              parameters: Dict[str, Any]) -> None:
        """Execute a strategic operation in the background."""
        try:
            # Update status to running
            self.active_operations[operation_id]["status"] = "running"
            self.active_operations[operation_id]["progress"] = 10
            
            # Execute the goal via the orchestrator
            context = {"parameters": parameters}
            
            # Update progress periodically during execution
            progress_updater = asyncio.create_task(
                self._update_progress(operation_id)
            )
            
            # Execute the goal
            result = await self.orchestrator.orchestrate_goal(goal, context)
            
            # Cancel progress updater
            progress_updater.cancel()
            
            # Store the result
            self.operation_results[operation_id] = result
            
            # Update operation status
            self.active_operations[operation_id]["status"] = "completed"
            self.active_operations[operation_id]["end_time"] = datetime.now().isoformat()
            self.active_operations[operation_id]["progress"] = 100
            self.active_operations[operation_id]["success"] = result.get("success", False)
            
            # Save the results to a file
            self._save_operation_results(operation_id, result)
            
            logger.info(f"Strategic operation {operation_id} completed")
            
        except Exception as e:
            logger.error(f"Error executing strategic operation {operation_id}: {str(e)}")
            
            # Update operation status
            self.active_operations[operation_id]["status"] = "failed"
            self.active_operations[operation_id]["end_time"] = datetime.now().isoformat()
            self.active_operations[operation_id]["error"] = str(e)
            self.active_operations[operation_id]["progress"] = 100
            self.active_operations[operation_id]["success"] = False
    
    async def _update_progress(self, operation_id: str) -> None:
        """Update the progress of an operation periodically."""
        try:
            progress = 10
            while operation_id in self.active_operations and self.active_operations[operation_id]["status"] == "running":
                # Increment progress up to 90% (last 10% reserved for completion)
                if progress < 90:
                    progress += 5
                    self.active_operations[operation_id]["progress"] = progress
                
                # Wait a bit before updating again
                await asyncio.sleep(3)
                
        except asyncio.CancelledError:
            # Task was cancelled, which is expected
            pass
        except Exception as e:
            logger.error(f"Error updating progress for operation {operation_id}: {str(e)}")
    
    def _save_operation_results(self, operation_id: str, result: Dict[str, Any]) -> None:
        """Save operation results to a file."""
        try:
            # Create a filename based on the operation ID
            filename = f"{operation_id}_results.json"
            filepath = os.path.join(self.results_dir, filename)
            
            # Save the result data
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
                
            logger.info(f"Saved operation results to {filepath}")
            
            # Update the operation record with the filepath
            self.active_operations[operation_id]["results_file"] = filepath
            
        except Exception as e:
            logger.error(f"Error saving operation results: {str(e)}")
    
    def get_operation_status(self, operation_id: str) -> Dict[str, Any]:
        """
        Get the status of a strategic operation.
        
        Args:
            operation_id: The ID of the operation to check
            
        Returns:
            Dictionary with operation status details
        """
        if operation_id not in self.active_operations:
            return {
                "operation_id": operation_id,
                "status": "not_found",
                "message": "Operation not found"
            }
            
        operation = self.active_operations[operation_id]
        
        response = {
            "operation_id": operation_id,
            "goal": operation["goal"],
            "status": operation["status"],
            "progress": operation["progress"],
            "start_time": operation["start_time"]
        }
        
        # Add additional details if available
        if "end_time" in operation:
            response["end_time"] = operation["end_time"]
        
        if "success" in operation:
            response["success"] = operation["success"]
            
        if "error" in operation:
            response["error"] = operation["error"]
            
        # Add a message based on status
        if operation["status"] == "initializing":
            response["message"] = "Operation is being initialized"
        elif operation["status"] == "running":
            response["message"] = f"Operation is running ({operation['progress']}% complete)"
        elif operation["status"] == "completed":
            response["message"] = "Operation completed successfully"
        elif operation["status"] == "failed":
            response["message"] = f"Operation failed: {operation.get('error', 'Unknown error')}"
            
        return response
    
    def get_operation_result(self, operation_id: str) -> Dict[str, Any]:
        """
        Get the full result of a completed strategic operation.
        
        Args:
            operation_id: The ID of the operation
            
        Returns:
            Dictionary with the operation result
        """
        if operation_id not in self.active_operations:
            return {
                "operation_id": operation_id,
                "status": "not_found",
                "message": "Operation not found"
            }
            
        operation = self.active_operations[operation_id]
        
        if operation["status"] != "completed":
            return {
                "operation_id": operation_id,
                "status": operation["status"],
                "message": f"Operation is not completed yet (status: {operation['status']})"
            }
            
        if operation_id in self.operation_results:
            result = self.operation_results[operation_id]
            
            # Add operation metadata to the result
            result["operation_id"] = operation_id
            result["goal"] = operation["goal"]
            
            return result
        else:
            # Try to load from file if not in memory
            try:
                filepath = operation.get("results_file")
                if filepath and os.path.exists(filepath):
                    with open(filepath, 'r', encoding='utf-8') as f:
                        result = json.load(f)
                        
                    # Add operation metadata to the result
                    result["operation_id"] = operation_id
                    result["goal"] = operation["goal"]
                    
                    return result
            except Exception as e:
                logger.error(f"Error loading operation results from file: {str(e)}")
                
            # Return a basic response if result not found
            return {
                "operation_id": operation_id,
                "status": "results_unavailable",
                "message": "Operation results are not available"
            }
    
    def list_operations(self, limit: int = 10, status_filter: str = None) -> List[Dict[str, Any]]:
        """
        List recent strategic operations.
        
        Args:
            limit: Maximum number of operations to return
            status_filter: Filter by status (e.g., "completed", "running")
            
        Returns:
            List of operation summaries
        """
        # Sort operations by start time (newest first)
        sorted_ops = sorted(
            self.active_operations.items(),
            key=lambda x: x[1].get("start_time", ""),
            reverse=True
        )
        
        # Apply status filter if specified
        if status_filter:
            sorted_ops = [
                (op_id, op) for op_id, op in sorted_ops
                if op.get("status") == status_filter
            ]
            
        # Limit the number of results
        sorted_ops = sorted_ops[:limit]
        
        # Format the results
        results = []
        for op_id, op in sorted_ops:
            result = {
                "operation_id": op_id,
                "goal": op.get("goal", ""),
                "status": op.get("status", ""),
                "progress": op.get("progress", 0),
                "start_time": op.get("start_time", ""),
                "success": op.get("success", None)
            }
            
            # Add end time if available
            if "end_time" in op:
                result["end_time"] = op["end_time"]
                
            results.append(result)
            
        return results
    
    def cancel_operation(self, operation_id: str) -> Dict[str, Any]:
        """
        Cancel a running strategic operation.
        
        Args:
            operation_id: The ID of the operation to cancel
            
        Returns:
            Dictionary with cancellation status
        """
        if operation_id not in self.active_operations:
            return {
                "operation_id": operation_id,
                "status": "not_found",
                "message": "Operation not found"
            }
            
        operation = self.active_operations[operation_id]
        
        if operation["status"] not in ["initializing", "running"]:
            return {
                "operation_id": operation_id,
                "status": operation["status"],
                "message": f"Cannot cancel operation with status: {operation['status']}"
            }
            
        # Update operation status
        operation["status"] = "cancelled"
        operation["end_time"] = datetime.now().isoformat()
        operation["progress"] = 100
        operation["success"] = False
        
        logger.info(f"Operation {operation_id} cancelled")
        
        return {
            "operation_id": operation_id,
            "status": "cancelled",
            "message": "Operation has been cancelled"
        }

# Singleton instance
controller = StrategyController()

def get_controller() -> StrategyController:
    """Get the singleton instance of the strategy controller."""
    return controller