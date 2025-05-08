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
import threading
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

# Import the web scraper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from scrapers.smokeshop_scraper import SmokeshopScraper
except ImportError as e:
    logging.error(f"Failed to import scraper: {e}")
    class SmokeshopScraper:
        def __init__(self):
            pass
        def scrape_multiple_sources(self, *args, **kwargs):
            return []
        def save_to_json(self, *args, **kwargs):
            return "Error: Scraper not available"

# Import the collaboration API
try:
    from core.agent_collaboration import (
        AgentCollaborationSystem, 
        CollaborationMessageType,
        CollaborationPriority,
        AgentTeamCoordinator
    )
    from core.collaboration_api import CollaborationAPIHandler
    collaboration_available = True
    logging.info("Agent collaboration system available")
except ImportError as e:
    logging.warning(f"Agent collaboration system not available: {e}")
    collaboration_available = False

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
                    response = "I can help with various tasks like:\n- Creating and monitoring goals\n- Managing agent teams\n- Providing system analytics\n- Answering questions about the Panion system\n- Web scraping data from online sources"
                elif "goal" in content.lower() or "task" in content.lower():
                    response = "I can help you create a new goal or task. Would you like me to help you define the requirements and assign it to the most suitable agents?"
                elif "agent" in content.lower() or "team" in content.lower():
                    response = "We have several agents with different capabilities. I can help you form a team for a specific task or show you the available agents."
                elif "stat" in content.lower() or "system" in content.lower():
                    response = f"The system is currently active. We have {len(AGENTS)} agents and 5 plugins available."
                # Check for web scraping requests related to businesses
                elif re.search(r"(scrape|find|get|collect|search).*(smoke\s*shop|smokeshop|business|store|restaurant|shop|company)", content.lower()) or \
                     re.search(r"(smoke\s*shop|smokeshop|business|store|restaurant|shop|company).*(info|data|details|phone|contact)", content.lower()):
                    
                    # Extract business type
                    business_type_match = re.search(r"(smoke\s*shop|restaurant|cafe|coffee\s*shop|bar|grocery\s*store|clothing\s*store|electronic\s*store|hardware\s*store|bookstore|pharmacy|gym|salon|spa|hotel|bank|gas\s*station|theater|cinema)", content.lower())
                    business_type = business_type_match.group(1) if business_type_match else "business"
                    
                    # Extract location if specified
                    location_match = re.search(r"in\s+([A-Za-z\s]+)(?:,|\.|$|\s)", content)
                    location = location_match.group(1) if location_match else "New York"
                    
                    # Extract limit if specified
                    limit_match = re.search(r"(\d+)\s+(smoke\s*shops?|results|stores?|businesses|restaurants)", content)
                    limit = int(limit_match.group(1)) if limit_match else 10
                    limit = min(limit, 100)  # Cap at 100
                    
                    response = f"I'll scrape information for {limit} {business_type}s in {location}. This might take a minute..."
                    
                    # Start scraping in a background thread to avoid blocking
                    def scrape_in_background():
                        try:
                            # Try to import enhanced scraper first, fall back to smokeshop scraper if not available
                            try:
                                from scrapers.enhanced_scraper import EnhancedScraper
                                scraper = EnhancedScraper()
                                shops = scraper.scrape_business_directory(
                                    business_type=business_type,
                                    location=location,
                                    limit=limit
                                )
                                filepath = scraper.save_to_json(shops, f"{business_type.replace(' ', '_')}_{location.replace(' ', '_')}.json")
                            except ImportError:
                                # Fall back to smokeshop scraper
                                from scrapers.smokeshop_scraper import SmokeshopScraper
                                scraper = SmokeshopScraper()
                                shops = scraper.scrape_multiple_sources(location=location, limit=limit)
                                filepath = scraper.save_to_json(shops)
                                
                            logger.info(f"Scraping complete: {len(shops)} businesses saved to {filepath}")
                        except Exception as e:
                            logger.error(f"Error during scraping: {str(e)}")
                    
                    threading.Thread(target=scrape_in_background).start()
                    
                # Check for data analysis requests
                elif re.search(r"(analyze|chart|graph|visualization|trend|plot|dashboard).*(data|csv|json|file|result)", content.lower()):
                    
                    # Extract analysis type
                    analysis_type_match = re.search(r"(bar\s*chart|pie\s*chart|line\s*graph|histogram|scatter\s*plot|correlation|summary|statistics)", content.lower())
                    analysis_type = analysis_type_match.group(1) if analysis_type_match else "summary"
                    
                    # Extract data file if specified
                    file_match = re.search(r"(?:data|file|csv|json)\s+(?:called|named)\s+([a-zA-Z0-9_\-.]+)", content.lower())
                    data_file = file_match.group(1) if file_match else "last_scraped_data"
                    
                    response = f"I'll analyze your data and create a {analysis_type} visualization. This might take a moment..."
                    
                    # We'd normally start data analysis here, but we'll just simulate it for now
                    # In a real implementation, we'd use our data analysis module
                    
                # Check for document processing requests
                elif re.search(r"(extract|analyze|process|parse|ocr).*(document|pdf|doc|docx|image|text)", content.lower()):
                    
                    # Extract document processing type
                    process_type_match = re.search(r"(text\s*extraction|ocr|table\s*extraction|image\s*extraction|summary|analysis)", content.lower())
                    process_type = process_type_match.group(1) if process_type_match else "text_extraction"
                    
                    response = f"I'll process your document using {process_type}. Please upload the document you'd like to process."
                    
                # Check for video generation requests
                elif re.search(r"(generate|create|make|produce).*(video|animation|clip|footage)", content.lower()):
                    
                    # Extract video details
                    style_match = re.search(r"(?:in|with)\s+(?:a|an)?\s+([a-zA-Z\s]+)\s+style", content.lower())
                    style = style_match.group(1) if style_match else "professional"
                    
                    duration_match = re.search(r"(\d+)\s+(?:second|minute)s?", content.lower())
                    duration = duration_match.group(1) if duration_match else "30"
                    duration_unit = "seconds" if "second" in content.lower() else "minutes"
                    
                    response = f"I'll help you create a {style} style video. Please provide more details about what you'd like to show in the video."
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
            
            # Web scraping endpoint
            elif path == "/scrape":
                target_type = data.get("target_type", "")
                location = data.get("location", "New York")
                limit = data.get("limit", 10)
                additional_params = data.get("additional_params", {})
                
                logger.info(f"Scraping request: {target_type} in {location}, limit {limit}")
                
                try:
                    # Try to import enhanced scraper first, fall back to smokeshop scraper if not available
                    try:
                        from scrapers.enhanced_scraper import EnhancedScraper
                        scraper = EnhancedScraper()
                        results = scraper.scrape_business_directory(
                            business_type=target_type,
                            location=location,
                            limit=limit
                        )
                        output_file = f"{target_type.replace(' ', '_')}_{location.replace(' ', '_')}.json"
                        filepath = scraper.save_to_json(results, output_file)
                    except ImportError:
                        # Fall back to smokeshop scraper
                        from scrapers.smokeshop_scraper import SmokeshopScraper
                        scraper = SmokeshopScraper()
                        results = scraper.scrape_multiple_sources(location=location, limit=limit)
                        filepath = scraper.save_to_json(results)
                    
                    self._set_headers()
                    self.wfile.write(json.dumps({
                        "status": "success",
                        "result_count": len(results),
                        "filepath": filepath,
                        "message": f"Successfully scraped {len(results)} results"
                    }).encode())
                except Exception as e:
                    logger.error(f"Error in scraping: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": f"Error during scraping: {str(e)}"
                    }).encode())
            
            # Enhanced scraping endpoint with adaptive strategy selection
            elif path == "/scrape/enhanced":
                business_type = data.get("business_type", "business")
                location = data.get("location", "New York")
                limit = data.get("limit", 10)
                source = data.get("source", "adaptive")
                
                logger.info(f"Enhanced scraping request: {business_type} in {location}, using {source} strategy, limit {limit}")
                
                try:
                    # Import the enhanced scraper
                    try:
                        from scrapers.enhanced_scraper import EnhancedScraper
                        scraper = EnhancedScraper()
                        
                        # Execute scraping with the enhanced adaptive system
                        results = scraper.scrape_business_directory(
                            business_type=business_type,
                            location=location,
                            limit=limit,
                            source=source
                        )
                        
                        # Save results to file
                        output_file = f"{business_type.replace(' ', '_')}_{location.replace(' ', '_')}.json"
                        filepath = scraper.save_to_json(results, output_file)
                        
                        # Return successful response
                        self._set_headers()
                        self.wfile.write(json.dumps({
                            "status": "success",
                            "result_count": len(results),
                            "filepath": filepath,
                            "last_successful_strategy": getattr(scraper, "last_successful_strategy", None),
                            "message": f"Successfully scraped {len(results)} results using adaptive strategy system"
                        }).encode())
                    except ImportError as ie:
                        logger.error(f"Error importing enhanced scraper: {ie}")
                        self._set_headers(500)
                        self.wfile.write(json.dumps({
                            "status": "error",
                            "error": "Enhanced scraper module not available",
                            "message": str(ie)
                        }).encode())
                except Exception as e:
                    logger.error(f"Error in scraping: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": f"Error during scraping: {str(e)}"
                    }).encode())
            
            # Data analysis endpoint
            elif path == "/analyze":
                data_file = data.get("data_file", "")
                analysis_type = data.get("analysis_type", "summary")
                params = data.get("params", {})
                
                logger.info(f"Analysis request: {analysis_type} on {data_file}")
                
                # This would be implemented with our data analysis module
                # For now, just return a mock response
                self._set_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "analysis_type": analysis_type,
                    "data_file": data_file,
                    "message": f"Analysis of type {analysis_type} completed successfully"
                }).encode())
            
            # Document processing endpoint
            elif path == "/document":
                file_data = data.get("file", "")
                process_type = data.get("process_type", "text_extraction")
                params = data.get("params", {})
                
                logger.info(f"Document processing request: {process_type}")
                
                # This would be implemented with our document processor module
                # For now, just return a mock response
                self._set_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "process_type": process_type,
                    "message": f"Document processing with {process_type} completed successfully"
                }).encode())
            
            # Video generation endpoint
            elif path == "/video":
                title = data.get("title", "")
                description = data.get("description", "")
                style = data.get("style", "professional")
                duration = data.get("duration", 30)
                resolution = data.get("resolution", "1080p")
                
                logger.info(f"Video generation request: {title}")
                
                # This would be implemented with our video agent
                # For now, just return a mock response
                self._set_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "title": title,
                    "style": style,
                    "duration": duration,
                    "resolution": resolution,
                    "message": f"Video '{title}' has been queued for generation"
                }).encode())
            
            # Task scheduling endpoint
            elif path == "/schedule":
                task_name = data.get("task_name", "")
                task_type = data.get("task_type", "")
                schedule = data.get("schedule", {})
                params = data.get("params", {})
                
                logger.info(f"Task scheduling request: {task_name} of type {task_type}")
                
                # This would be implemented with our task automation module
                # For now, just return a mock response
                self._set_headers()
                self.wfile.write(json.dumps({
                    "status": "success",
                    "task_id": f"task_{hash(task_name) % 10000}",
                    "task_name": task_name,
                    "task_type": task_type,
                    "message": f"Task '{task_name}' has been scheduled successfully"
                }).encode())
            
            # Clara chat endpoint
            elif path == "/clara/chat":
                content = data.get("content", "")
                session_id = data.get("session_id", "default")
                user_id = data.get("user_id", "anonymous")
                
                logger.info(f"Clara chat request: {content}")
                
                # This would use the Clara emotional support agent
                # For now, just return a simulated response
                response = f"I understand how you feel about '{content}'. What aspects of this would you like to explore further? I'm here to help you find clarity and expand your perspective."
                
                self._set_headers()
                self.wfile.write(json.dumps({
                    "response": response,
                    "emotions_detected": ["interest", "curiosity"],
                    "session_id": session_id,
                    "additional_info": {
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                }).encode())
            
            # Clara goal creation endpoint
            elif path == "/clara/goal":
                content = data.get("content", "")
                session_id = data.get("session_id", "default")
                
                logger.info(f"Clara goal creation request: {content}")
                
                # This would use the Clara goal creation functionality
                # For now, just return a simulated response
                goal_id = f"goal_{hash(content) % 10000}"
                
                self._set_headers()
                self.wfile.write(json.dumps({
                    "goal_id": goal_id,
                    "title": content[:50] + ("..." if len(content) > 50 else ""),
                    "description": content,
                    "steps": [
                        {"title": "First step", "description": "Get started"},
                        {"title": "Plan", "description": "Create a detailed plan"},
                        {"title": "Execute", "description": "Put plan into action"}
                    ],
                    "message": "I've created this goal for you. Would you like to add more specific steps or clarify any details?"
                }).encode())
            
            # Clara goals list endpoint
            elif path == "/clara/goals":
                logger.info("Clara goals list request")
                
                # This would use the Clara goals system
                # For now, just return simulated goals
                self._set_headers()
                self.wfile.write(json.dumps([
                    {
                        "goal_id": "goal_1234",
                        "title": "Learn a new language",
                        "progress": 0.3,
                        "clarity": "specific",
                        "steps_completion": "2/5"
                    },
                    {
                        "goal_id": "goal_5678",
                        "title": "Write a book",
                        "progress": 0.1,
                        "clarity": "forming",
                        "steps_completion": "1/8"
                    }
                ]).encode())
            
            # Clara dream expansion endpoint
            elif path == "/clara/expand-dream":
                goal_id = data.get("goal_id", "")
                content = data.get("content", "")
                
                logger.info(f"Clara dream expansion request for goal {goal_id}: {content}")
                
                # This would use the Clara dream expansion functionality
                # For now, just return a simulated response
                self._set_headers()
                self.wfile.write(json.dumps({
                    "goal_id": goal_id,
                    "expanded_vision": content,
                    "new_possibilities": [
                        "Consider approaching this from a different angle",
                        "What if you expanded the scope to include...",
                        "This could open doors to opportunities in..."
                    ],
                    "message": "I love how you're expanding your vision! These new possibilities could really enhance your goal."
                }).encode())
            
            # Agent Collaboration API endpoints
            elif collaboration_available and path.startswith("/collaboration/"):
                # Extract the specific collaboration endpoint
                collab_path = path.replace("/collaboration", "")
                
                # Handle the request using the collaboration API handler
                try:
                    response_data = CollaborationAPIHandler.handle_request(
                        handler=self,
                        path=collab_path,
                        method="POST",
                        data=data
                    )
                    
                    self._set_headers()
                    self.wfile.write(json.dumps(response_data).encode())
                except Exception as e:
                    logger.error(f"Error in collaboration API: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "error": "Collaboration API error",
                        "message": str(e)
                    }).encode())
            
            # Register agent endpoint
            elif collaboration_available and path == "/agents/register":
                agent_id = data.get("agent_id", str(uuid.uuid4()))
                agent_name = data.get("agent_name", "")
                capabilities = data.get("capabilities", [])
                
                if not agent_name:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({
                        "error": "Bad request",
                        "message": "agent_name is required"
                    }).encode())
                    return
                
                try:
                    # Register the agent with the collaboration system
                    success = collaboration_system.register_agent(
                        agent_id=agent_id,
                        agent_name=agent_name,
                        capabilities=capabilities
                    )
                    
                    self._set_headers()
                    self.wfile.write(json.dumps({
                        "status": "success" if success else "error",
                        "message": f"Agent {agent_name} registered successfully" if success else f"Failed to register agent {agent_name}",
                        "agent_id": agent_id
                    }).encode())
                except Exception as e:
                    logger.error(f"Error registering agent: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "error": "Registration error",
                        "message": str(e)
                    }).encode())
            
            # Create team endpoint
            elif collaboration_available and path == "/teams/create":
                team_id = data.get("team_id", str(uuid.uuid4()))
                team_name = data.get("name", "")
                description = data.get("description", "")
                coordinator_id = data.get("coordinator_id")
                
                if not team_name:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({
                        "error": "Bad request",
                        "message": "team name is required"
                    }).encode())
                    return
                
                try:
                    # Create the team
                    success = team_coordinator.create_team(
                        team_id=team_id,
                        name=team_name,
                        description=description,
                        coordinator_id=coordinator_id
                    )
                    
                    self._set_headers()
                    self.wfile.write(json.dumps({
                        "status": "success" if success else "error",
                        "message": f"Team {team_name} created successfully" if success else f"Failed to create team {team_name}",
                        "team_id": team_id
                    }).encode())
                except Exception as e:
                    logger.error(f"Error creating team: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "error": "Team creation error",
                        "message": str(e)
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