"""
Simple Chat API for Panion
A minimal HTTP server that provides the chat interface functionality
without requiring FastAPI dependencies
"""

import os
import sys
import json
import time
import logging
import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
PORT = int(os.environ.get("PANION_API_PORT", 8000))
HOST = "0.0.0.0"

# Mock data for responses
AGENTS = [
    {
        "id": "agent1",
        "name": "Alice",
        "skills": {
            "coding": 0.9,
            "testing": 0.8,
            "problem_solving": 0.9,
            "communication": 0.8
        },
        "capabilities": ["development", "testing", "planning"],
        "availability": True,
        "current_team": None,
        "performance_metrics": {"success_rate": 0.95}
    },
    {
        "id": "agent2",
        "name": "Bob",
        "skills": {
            "coding": 0.7,
            "testing": 0.9,
            "problem_solving": 0.8,
            "communication": 0.7
        },
        "capabilities": ["testing", "debugging", "analysis"],
        "availability": True,
        "current_team": None,
        "performance_metrics": {"success_rate": 0.88}
    },
    {
        "id": "agent3",
        "name": "Charlie",
        "skills": {
            "coding": 0.8,
            "testing": 0.7,
            "problem_solving": 0.9,
            "communication": 0.9
        },
        "capabilities": ["planning", "coordination", "development"],
        "availability": True,
        "current_team": None,
        "performance_metrics": {"success_rate": 0.92}
    }
]

# Start time for uptime tracking
START_TIME = datetime.datetime.now()

class PanionAPIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the Panion API"""
    
    def _set_headers(self, status_code=200, content_type="application/json"):
        """Set response headers"""
        self.send_response(status_code)
        self.send_header("Content-type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")  # Enable CORS
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self._set_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        try:
            # Health check endpoint
            if path == "/health":
                self._set_headers()
                self.wfile.write(json.dumps({
                    "status": "ok",
                    "initialized": True
                }).encode())
                
            # Get uptime statistics
            elif path == "/uptime":
                self._set_headers()
                uptime_seconds = (datetime.datetime.now() - START_TIME).total_seconds()
                self.wfile.write(json.dumps({
                    "start_time": START_TIME.isoformat(),
                    "uptime_seconds": uptime_seconds,
                    "status": "active",
                    "performance_metrics": {
                        "memory_usage_mb": 128,
                        "cpu_percent": 15.5,
                        "requests_handled": 42
                    }
                }).encode())
                
            # Get available agents
            elif path == "/agents":
                self._set_headers()
                self.wfile.write(json.dumps(AGENTS).encode())
                
            # Get system stats
            elif path == "/system/stats":
                self._set_headers()
                self.wfile.write(json.dumps({
                    "status": "active",
                    "agent_count": len(AGENTS),
                    "plugin_count": 5,
                    "memory_usage": {
                        "total_mb": 256,
                        "used_mb": 128
                    },
                    "cpu_usage": 25.5,
                    "uptime_hours": (datetime.datetime.now() - START_TIME).total_seconds() / 3600
                }).encode())
                
            else:
                # Not found
                self._set_headers(404)
                self.wfile.write(json.dumps({
                    "error": "Not found",
                    "message": f"Endpoint {path} not found"
                }).encode())
                
        except Exception as e:
            logger.error(f"Error handling GET request: {str(e)}")
            self._set_headers(500)
            self.wfile.write(json.dumps({
                "error": "Internal server error",
                "message": str(e)
            }).encode())
    
    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers.get("Content-Length", 0))
        request_body = self.rfile.read(content_length).decode("utf-8")
        
        try:
            data = json.loads(request_body)
            parsed_url = urlparse(self.path)
            path = parsed_url.path
            
            # Chat endpoint
            if path == "/chat":
                content = data.get("content", "")
                session_id = data.get("sessionId", "default")
                
                logger.info(f"Received chat message: {content}")
                
                # Example responses based on message content
                if "hello" in content.lower() or "hi" in content.lower():
                    response = "Hello! I'm your Panion assistant. How can I help you today?"
                elif "help" in content.lower():
                    response = "I can help with various tasks like:\n- Creating and monitoring goals\n- Managing agent teams\n- Providing system analytics\n- Answering questions about the Panion system"
                elif "goal" in content.lower() or "task" in content.lower():
                    response = "I can help you create a new goal or task. Would you like me to help you define the requirements and assign it to the most suitable agents?"
                elif "agent" in content.lower() or "team" in content.lower():
                    response = "We have several agents with different capabilities. I can help you form a team for a specific task or show you the available agents."
                elif "stat" in content.lower() or "system" in content.lower():
                    response = f"The system is currently active. We have {len(AGENTS)} agents and 5 plugins available."
                else:
                    # Default response for other types of messages
                    response = f"I understand that you're asking about '{content}'. Let me analyze this and find the best way to help you with this request."
                
                self._set_headers()
                self.wfile.write(json.dumps({
                    "response": response,
                    "thinking": f"Analyzing input: '{content}'",
                    "additional_info": {
                        "timestamp": datetime.datetime.now().isoformat(),
                        "session_id": session_id,
                        "intent_detected": detect_intent(content),
                        "confidence": 0.85
                    }
                }).encode())
            
            # Create goal endpoint
            elif path == "/goals":
                goal_description = data.get("goal_description", "")
                priority = data.get("priority", "medium")
                
                logger.info(f"Creating new goal: {goal_description}")
                
                goal_id = f"goal_{hash(goal_description) % 10000}"
                
                self._set_headers()
                self.wfile.write(json.dumps({
                    "goal_id": goal_id,
                    "status": "submitted",
                    "message": "Goal submitted successfully"
                }).encode())
            
            else:
                # Not found
                self._set_headers(404)
                self.wfile.write(json.dumps({
                    "error": "Not found",
                    "message": f"Endpoint {path} not found"
                }).encode())
        
        except json.JSONDecodeError:
            logger.error("Invalid JSON in request body")
            self._set_headers(400)
            self.wfile.write(json.dumps({
                "error": "Bad request",
                "message": "Invalid JSON in request body"
            }).encode())
            
        except Exception as e:
            logger.error(f"Error handling POST request: {str(e)}")
            self._set_headers(500)
            self.wfile.write(json.dumps({
                "error": "Internal server error",
                "message": str(e)
            }).encode())

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

def run_server():
    """Run the HTTP server"""
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, PanionAPIHandler)
    logger.info(f"Starting Panion API server on {HOST}:{PORT}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    
    httpd.server_close()
    logger.info("Panion API server stopped")

if __name__ == "__main__":
    run_server()