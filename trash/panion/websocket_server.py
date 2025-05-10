"""
Panion WebSocket Server
Provides bidirectional communication with enhanced performance and Manus-like capabilities.
"""

import os
import sys
import json
import logging
import asyncio
import random
import time
from typing import Dict, List, Any, Optional, Set, Callable
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Message handlers for different types of requests
message_handlers = {}

# Active connections
active_connections = set()

# Register handlers for different message types
def register_handler(message_type):
    def decorator(func):
        message_handlers[message_type] = func
        return func
    return decorator

class EnhancedReasoning:
    """
    Provides Manus-like autonomous reasoning capabilities
    """
    
    def __init__(self, memory_manager=None, knowledge_graph=None):
        self.memory_manager = memory_manager
        self.knowledge_graph = knowledge_graph
        self.active_explorations = {}
        self.insights_queue = asyncio.Queue()
        
        # Initialize background tasks (but don't start them yet)
        # They will be started in the event loop from start_server
        self.background_tasks = []
    
    async def analyze_request(self, message: str, session_id: str) -> Dict[str, Any]:
        """Analyze a request to determine optimal processing approach"""
        
        # 1. Determine if we should be proactive or reactive
        proactivity_score = self.calculate_proactivity_score(message, session_id)
        
        # 2. Look for opportunities to decompose tasks
        subtasks = await self.decompose_task(message) if proactivity_score > 0.7 else []
        
        # 3. Check if we need to autonomously gather information
        needs_research = await self.needs_additional_information(message, session_id)
        
        # 4. Generate reasoning path options (Manus can consider multiple approaches)
        reasoning_paths = await self.generate_reasoning_paths(message, session_id)
        
        # 5. Determine if we should take initiative beyond the request
        initiative_actions = []
        if proactivity_score > 0.8:
            initiative_actions = await self.generate_initiative_actions(message, session_id)
        
        return {
            "proactivity_score": proactivity_score,
            "subtasks": subtasks,
            "needs_research": needs_research,
            "reasoning_paths": reasoning_paths,
            "initiative_actions": initiative_actions
        }
    
    def calculate_proactivity_score(self, message: str, session_id: str) -> float:
        """Calculate how proactive we should be based on the message and user history"""
        # Simplified implementation - would use NLP and user history in production
        
        # Higher scores for requests that seem to need more initiative
        indicators = [
            "can you help", "i need", "figure out", "find a way", 
            "how would", "create a", "build me", "optimize",
            "develop a", "improve", "what's the best"
        ]
        
        base_score = 0.5  # Moderate proactivity by default
        
        # Adjust based on keywords
        for indicator in indicators:
            if indicator in message.lower():
                base_score += 0.1
                
        # Cap at 0.95 - never be completely autonomous
        return min(base_score, 0.95)
    
    async def decompose_task(self, message: str) -> List[Dict[str, Any]]:
        """Break down a complex task into smaller subtasks"""
        # In a real implementation, this would use LLM to decompose the task
        
        # Placeholder implementation
        if len(message) < 20:
            # Simple request, no decomposition needed
            return []
            
        # Simple rule-based decomposition for demo
        if "research" in message.lower():
            return [
                {"id": "subtask_1", "description": "Gather relevant information", "status": "pending"},
                {"id": "subtask_2", "description": "Analyze key findings", "status": "pending"},
                {"id": "subtask_3", "description": "Synthesize conclusions", "status": "pending"}
            ]
            
        if "build" in message.lower() or "create" in message.lower():
            return [
                {"id": "subtask_1", "description": "Define requirements", "status": "pending"},
                {"id": "subtask_2", "description": "Design solution architecture", "status": "pending"},
                {"id": "subtask_3", "description": "Implement core functionality", "status": "pending"},
                {"id": "subtask_4", "description": "Test and refine", "status": "pending"}
            ]
            
        # For other cases, generate a generic decomposition
        return [
            {"id": "subtask_1", "description": "Analyze request", "status": "pending"},
            {"id": "subtask_2", "description": "Process core requirements", "status": "pending"},
            {"id": "subtask_3", "description": "Deliver solution", "status": "pending"}
        ]
    
    async def needs_additional_information(self, message: str, session_id: str) -> bool:
        """Determine if we need to gather more information to properly address the request"""
        # This would use contextual understanding to determine information gaps
        
        # Simplified implementation
        vague_indicators = ["something like", "not sure exactly", "whatever works", "you decide"]
        return any(indicator in message.lower() for indicator in vague_indicators)
    
    async def generate_reasoning_paths(self, message: str, session_id: str) -> List[Dict[str, Any]]:
        """Generate multiple possible reasoning approaches (Manus considers alternatives)"""
        # Would use LLM to generate multiple solution paths
        
        # Simplified implementation
        return [
            {
                "id": "path_1",
                "description": "Direct solution approach",
                "confidence": 0.8,
                "reasoning": "Addressing the explicit request directly"
            },
            {
                "id": "path_2",
                "description": "Explorative approach",
                "confidence": 0.6,
                "reasoning": "Exploring additional context and related information"
            }
        ]
    
    async def generate_initiative_actions(self, message: str, session_id: str) -> List[Dict[str, Any]]:
        """Generate autonomous actions that go beyond the explicit request"""
        # Would use sophisticated reasoning to identify valuable additional actions
        
        # Simplified implementation
        return [
            {
                "id": "initiative_1",
                "description": "Suggest related improvements",
                "reasoning": "Based on pattern recognition in user requests"
            },
            {
                "id": "initiative_2",
                "description": "Provide additional context",
                "reasoning": "Enhancing understanding with relevant information"
            }
        ]
    
    async def background_insight_generator(self):
        """
        Continuously generates insights in the background (like Manus) by analyzing
        patterns, history, and available knowledge
        """
        while True:
            try:
                # This would use more sophisticated analysis in production
                # Check for patterns across sessions, detect optimization opportunities
                
                # Generate an insight occasionally (simulated)
                await asyncio.sleep(random.randint(60, 300))  # 1-5 minute interval
                
                if random.random() < 0.3:  # 30% chance of generating insight
                    insight = {
                        "id": f"insight_{time.time()}",
                        "type": random.choice(["optimization", "pattern", "suggestion"]),
                        "content": "I've noticed a pattern in your data processing tasks that could be optimized.",
                        "confidence": random.uniform(0.7, 0.95)
                    }
                    
                    await self.insights_queue.put(insight)
                    logger.info(f"Generated background insight: {insight['type']}")
            except Exception as e:
                logger.error(f"Error in background insight generator: {str(e)}")
                await asyncio.sleep(60)  # Wait a bit before retrying
    
    async def pattern_detector(self):
        """Detects patterns in user behavior and system performance"""
        while True:
            try:
                # Would analyze user session data, system metrics, etc.
                await asyncio.sleep(120)  # Check every 2 minutes
                
                # Simplified placeholder
                logger.debug("Pattern detector run completed")
            except Exception as e:
                logger.error(f"Error in pattern detector: {str(e)}")
                await asyncio.sleep(60)
    
    async def get_next_insight(self, timeout=0.1) -> Optional[Dict[str, Any]]:
        """Get the next available insight, if any"""
        try:
            return await asyncio.wait_for(self.insights_queue.get(), timeout)
        except asyncio.TimeoutError:
            return None

# Create an instance of the enhanced reasoning system
enhanced_reasoning = EnhancedReasoning()

# Mock chat request processor - will be replaced with the real chat processor
async def process_chat_request(message_data):
    """Process a chat request and return a response"""
    content = message_data.get("content", "")
    session_id = message_data.get("session_id", "default")
    
    # This is a placeholder - in the real system, we would call the chat processing logic
    # For now, just simulate a response with a delay
    await asyncio.sleep(0.5)
    
    return {
        "response": f"This is a simulated response to: {content}",
        "session_id": session_id,
        "timestamp": time.time()
    }

# Mock capability extraction - will be replaced with the real capability extraction
async def extract_capabilities(message_data):
    """Extract capabilities needed for a message"""
    content = message_data.get("content", "")
    
    # Simplified capability extraction based on keywords
    capabilities = []
    
    if "search" in content.lower() or "find" in content.lower():
        capabilities.append("web_search")
        
    if "analyze" in content.lower() or "understand" in content.lower():
        capabilities.append("analysis")
        
    if "create" in content.lower() or "generate" in content.lower():
        capabilities.append("generation")
        
    return capabilities

@register_handler("chat")
async def handle_chat(websocket, message_data):
    """Handle chat messages"""
    response = await process_chat_request(message_data)
    return response

@register_handler("capability_check")
async def handle_capability_check(websocket, message_data):
    """Check what capabilities are needed"""
    capabilities = await extract_capabilities(message_data)
    return {"capabilities": capabilities}

@register_handler("enhanced_analysis")
async def handle_enhanced_analysis(websocket, message_data):
    """Handle requests for enhanced Manus-like analysis"""
    message = message_data.get("content", "")
    session_id = message_data.get("session_id", "default")
    
    analysis = await enhanced_reasoning.analyze_request(message, session_id)
    return analysis

@register_handler("heartbeat")
async def handle_heartbeat(websocket, message_data):
    """Handle heartbeat messages"""
    return {"status": "alive", "timestamp": time.time()}

# Main WebSocket connection handler
# Updated to match the expected API signature (only one parameter)
async def connection_handler(websocket):
    # Store connection details for logging
    client_info = {
        "remote_address": getattr(websocket, "remote_address", "unknown"),
        "id": id(websocket),  # Use object ID as unique identifier
        "protocol": getattr(websocket, "subprotocol", "none")
    }
    
    logger.info(f"New WebSocket connection from {client_info['remote_address']}")
    
    # Wrap the entire handler in try/except for robust error handling
    try:
        # Add to active connections
        active_connections.add(websocket)
        
        # Send initial connection acknowledgment
        try:
            await websocket.send(json.dumps({
                "type": "connection_established",
                "timestamp": time.time(),
                "message": "Connected to Panion WebSocket server"
            }))
        except Exception as e:
            logger.error(f"Failed to send welcome message: {str(e)}")
            # Continue even if welcome message fails
        
        # Ping periodically to keep connection alive
        ping_task = None
        try:
            # Create ping task that runs in background
            async def ping_client():
                try:
                    while True:
                        await asyncio.sleep(30)  # Send ping every 30 seconds
                        try:
                            # For newer websockets versions
                            pong_waiter = await websocket.ping()
                            await asyncio.wait_for(pong_waiter, timeout=10)
                        except Exception as e:
                            logger.warning(f"Ping failed for client {client_info['id']}: {str(e)}")
                            # If ping fails 2 times in a row, close the connection
                            return
                except asyncio.CancelledError:
                    # Task was cancelled, can safely exit
                    return
                except Exception as e:
                    logger.error(f"Error in ping task: {str(e)}")
                    return
                    
            # Start the ping task
            ping_task = asyncio.create_task(ping_client())
            
            # Handle messages in a loop
            async for message in websocket:
                try:
                    # Parse the message
                    data = json.loads(message)
                    message_id = data.get("id", "unknown")
                    message_type = data.get("type")
                    
                    logger.info(f"Received message {message_id} of type {message_type}")
                    
                    # Find the appropriate handler
                    handler = message_handlers.get(message_type)
                    if handler:
                        # Process the message with the handler
                        response = await handler(websocket, data)
                        
                        # Send response with the same ID
                        await websocket.send(json.dumps({
                            "id": message_id,
                            "type": f"{message_type}_response",
                            "data": response
                        }))
                    else:
                        logger.warning(f"No handler for message type: {message_type}")
                        await websocket.send(json.dumps({
                            "id": message_id,
                            "type": "error",
                            "error": f"Unsupported message type: {message_type}"
                        }))
                except json.JSONDecodeError:
                    logger.error("Invalid JSON received")
                    try:
                        await websocket.send(json.dumps({
                            "type": "error", 
                            "error": "Invalid JSON"
                        }))
                    except Exception as send_err:
                        logger.error(f"Failed to send error response: {str(send_err)}")
                except Exception as e:
                    logger.error(f"Error processing message: {str(e)}")
                    # Try to send an error response, but don't crash if it fails
                    try:
                        message_id = "unknown"
                        # Directly use a default value without referencing 'data'
                            
                        await websocket.send(json.dumps({
                            "id": message_id,
                            "type": "error",
                            "error": str(e)
                        }))
                    except Exception as send_err:
                        logger.error(f"Failed to send error response: {str(send_err)}")
        
        except websockets.exceptions.ConnectionClosed as e:
            close_code = getattr(e, "code", 1000)
            close_reason = getattr(e, "reason", "Normal closure")
            logger.info(f"WebSocket connection closed: code={close_code}, reason={close_reason}")
        except Exception as e:
            logger.error(f"Unexpected error in message handler: {str(e)}")
        finally:
            # Clean up ping task if it exists
            if ping_task and not ping_task.done():
                ping_task.cancel()
                try:
                    await ping_task
                except (asyncio.CancelledError, Exception):
                    pass
    
    except Exception as e:
        logger.error(f"Fatal error in connection handler: {str(e)}")
    finally:
        # Remove from active connections if it's still there
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info(f"Connection from {client_info['remote_address']} closed")

# Push insights to connected clients proactively (Manus-like initiative)
async def push_insights():
    """Push insights to connected clients proactively"""
    while True:
        try:
            insight = await enhanced_reasoning.get_next_insight()
            if insight and active_connections:
                # Send to all active connections
                message = {
                    "id": insight["id"],
                    "type": "insight",
                    "data": insight
                }
                
                websockets_to_remove = set()
                for websocket in active_connections:
                    try:
                        await websocket.send(json.dumps(message))
                    except websockets.exceptions.ConnectionClosed:
                        websockets_to_remove.add(websocket)
                
                # Clean up closed connections
                for websocket in websockets_to_remove:
                    active_connections.remove(websocket)
            
            await asyncio.sleep(0.1)  # Small sleep to prevent CPU hogging
        except Exception as e:
            logger.error(f"Error in insight pusher: {str(e)}")
            await asyncio.sleep(5)  # Wait before retrying

# Start the WebSocket server
async def start_websocket_server(host='0.0.0.0', port=8001):
    # Define an adapter function to match the expected interface
    async def connection_adapter(connection):
        # The path is automatically handled in the newer websockets version
        # Just pass the connection to our handler
        await connection_handler(connection)
    
    server = await websockets.serve(connection_adapter, host, port)
    logger.info(f"WebSocket server started on {host}:{port}")
    
    # Start the insight pusher
    asyncio.create_task(push_insights())
    
    return server

# Function to start the server
def start_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Start the background tasks for enhanced reasoning
    enhanced_reasoning.background_tasks.append(
        loop.create_task(enhanced_reasoning.background_insight_generator())
    )
    enhanced_reasoning.background_tasks.append(
        loop.create_task(enhanced_reasoning.pattern_detector())
    )
    
    # Start the websocket server
    ws_server = loop.run_until_complete(start_websocket_server())
    
    try:
        logger.info("Server running, press Ctrl+C to stop")
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down server...")
    finally:
        # Cancel all background tasks
        for task in enhanced_reasoning.background_tasks:
            task.cancel()
            
        # Close the server
        ws_server.close()
        loop.run_until_complete(ws_server.wait_closed())
        loop.close()
        logger.info("Server shut down")

if __name__ == "__main__":
    start_server()