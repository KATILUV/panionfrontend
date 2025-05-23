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
    from scrapers.enhanced_scraper import EnhancedScraper
except ImportError as e:
    logging.error(f"Failed to import enhanced scraper: {e}")
    # Fall back to older scraper if available
    try:
        from scrapers.smokeshop_scraper import SmokeshopScraper as EnhancedScraper
    except ImportError:
        logging.error("Failed to import any scraper")
        # Create a stub scraper class if no scraper is available
        class EnhancedScraper:
            def __init__(self):
                pass
            def scrape_business_directory(self, *args, **kwargs):
                return []
            def save_to_json(self, *args, **kwargs):
                return "Error: Scraper not available"

# Import the Daddy Data agent
try:
    from plugins.daddy_data_agent import DaddyDataAgent
    daddy_data_agent = DaddyDataAgent()
    daddy_data_available = True
    logging.info("Daddy Data Agent successfully imported")
except ImportError as e:
    logging.error(f"Failed to import Daddy Data Agent: {e}")
    daddy_data_available = False

# Create a task manager for background tasks
class TaskManager:
    def __init__(self):
        self.active_tasks = {}
        self.completed_tasks = {}
        self.task_threads = {}
    
    def create_task(self, task_id, task_details):
        """Create a new background task and start it."""
        import threading
        import uuid
        import datetime
        
        if not task_id:
            task_id = f"task_{uuid.uuid4().hex[:8]}"
            
        if task_id in self.active_tasks:
            return {
                "status": "error", 
                "message": f"Task with ID {task_id} already exists",
                "task_id": task_id
            }
        
        # Initialize task
        self.active_tasks[task_id] = {
            "id": task_id,
            "details": task_details,
            "status": "created",
            "progress": 0,
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "result": None,
            "messages": []
        }
        
        # Start in background thread
        thread = threading.Thread(
            target=self._execute_task,
            args=(task_id,),
            daemon=True
        )
        self.task_threads[task_id] = thread
        thread.start()
        
        return {
            "status": "created",
            "message": f"Task {task_id} created and started",
            "task_id": task_id
        }
    
    def _execute_task(self, task_id):
        """Execute a task in a background thread."""
        import time
        import datetime
        import uuid
        import os
        import json
        import asyncio
        
        if task_id not in self.active_tasks:
            return
            
        task = self.active_tasks[task_id]
        details = task["details"]
        
        try:
            # Update status
            self._update_task(task_id, status="running", progress=10,
                             message="Initializing task execution")
            
            # If this is a smoke shop research task
            if details.get("type") == "smokeshop_research":
                location = details.get("location", "New York")
                limit = details.get("limit", 20)
                
                # Update status
                self._update_task(task_id, progress=20,
                                 message=f"Starting smoke shop research for {location}")
                
                if daddy_data_available:
                    # Use the Daddy Data agent for searching
                    self._update_task(task_id, progress=30,
                                     message=f"Using Daddy Data agent to search for smoke shops in {location}")
                    
                    # Setup search parameters
                    search_params = {
                        'action': 'search',
                        'query': 'smoke shop',
                        'location': location,
                        'limit': limit
                    }
                    
                    # Execute the search (in event loop)
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    results = loop.run_until_complete(daddy_data_agent.execute(search_params))
                    loop.close()
                    
                    # Check if search was successful
                    if results.get('status') == 'completed':
                        shop_data = results.get('results', [])
                        
                        # Update status
                        self._update_task(task_id, progress=70,
                                         message=f"Data collection complete. Found {len(shop_data)} businesses.")
                        
                        # Save to file
                        os.makedirs("./data/daddy_data", exist_ok=True)
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"smokeshop_{location.replace(' ', '_')}_{timestamp}.json"
                        filepath = f"./data/daddy_data/{filename}"
                        
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(shop_data, f, indent=2)
                        
                        # Update status
                        self._update_task(task_id, progress=90, status="finalizing",
                                         message=f"Data saved to {filepath}")
                        
                        # Complete the task
                        self._update_task(task_id, progress=100, status="completed",
                                         message=f"Task completed successfully. Found {len(shop_data)} smoke shops.",
                                         result={"filepath": filepath, "count": len(shop_data)})
                    else:
                        error_message = results.get('error', 'Unknown error in Daddy Data agent')
                        self._update_task(task_id, status="error",
                                         message=f"Daddy Data agent search failed: {error_message}")
                        
                else:
                    # Try to use the legacy scraper
                    try:
                        self._update_task(task_id, progress=30,
                                        message=f"Daddy Data agent not available. Falling back to legacy scraper.")
                        
                        from scrapers.smokeshop_scraper import SmokeshopScraper
                        scraper = SmokeshopScraper()
                        
                        # Execute the scraping
                        shops = scraper.scrape_multiple_sources(location=location, limit=limit)
                        
                        # Update status
                        self._update_task(task_id, progress=70,
                                        message=f"Data collection complete. Found {len(shops)} businesses.")
                        
                        # Save results to file
                        os.makedirs("./data/scraped", exist_ok=True)
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"smokeshop_{location.replace(' ', '_')}_{timestamp}.json"
                        filepath = f"./data/scraped/{filename}"
                        
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(shops, f, indent=2)
                        
                        # Update status
                        self._update_task(task_id, progress=100, status="completed",
                                        message=f"Task completed successfully",
                                        result={"filepath": filepath, "count": len(shops)})
                                        
                    except ImportError:
                        self._update_task(task_id, status="error",
                                        message="Neither Daddy Data agent nor legacy scraper is available")
                
            # Handle other task types here
            else:
                self._update_task(task_id, status="error",
                                 message=f"Unknown task type: {details.get('type')}")
                
        except Exception as e:
            import traceback
            logging.error(f"Error in task {task_id}: {str(e)}")
            logging.error(traceback.format_exc())
            self._update_task(task_id, status="error",
                             message=f"Task failed: {str(e)}")
    
    def _update_task(self, task_id, status=None, progress=None, message=None, result=None):
        """Update a task's status and progress."""
        import datetime
        
        if task_id not in self.active_tasks:
            return
            
        task = self.active_tasks[task_id]
        
        if status:
            task["status"] = status
            
        if progress is not None:
            task["progress"] = progress
            
        if message:
            task["messages"].append({
                "time": datetime.datetime.now().isoformat(),
                "content": message
            })
            
        if result:
            task["result"] = result
            
        task["updated_at"] = datetime.datetime.now().isoformat()
        
        # If task is complete, move to completed tasks
        if status in ["completed", "error"]:
            task["completed_at"] = datetime.datetime.now().isoformat()
            self.completed_tasks[task_id] = task
            del self.active_tasks[task_id]
    
    def get_task_status(self, task_id):
        """Get the current status of a task."""
        if task_id in self.active_tasks:
            return {
                "status": "active",
                "task_data": self.active_tasks[task_id]
            }
            
        if task_id in self.completed_tasks:
            return {
                "status": "completed",
                "task_data": self.completed_tasks[task_id]
            }
            
        return {
            "status": "error",
            "message": f"Task {task_id} not found"
        }
    
    def list_tasks(self):
        """List all tasks."""
        return {
            "active_tasks": list(self.active_tasks.values()),
            "completed_tasks": list(self.completed_tasks.values()),
            "total_active": len(self.active_tasks),
            "total_completed": len(self.completed_tasks)
        }

# Initialize task manager
task_manager = TaskManager()

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
                # Check both formats of session ID
                session_id = data.get("session_id", data.get("sessionId", "default"))
                
                logger.info(f"Received chat message: {content}")
                
                # Initialize variables with defaults to avoid reference errors
                response = "I'm analyzing your request..."
                thinking = f"Processing request: '{content}'"
                capabilities = []
                
                try:
                    # Get metadata if available
                    metadata = data.get("metadata", {})
                    if metadata:
                        capabilities = metadata.get("capabilities", [])
                        has_required = metadata.get("hasRequiredCapabilities", True)
                    
                    # Also check direct parameters in the root of the request for flexibility
                    if not capabilities and "capabilities" in data:
                        capabilities = data.get("capabilities", [])
                    
                    has_required = data.get("hasRequiredCapabilities", metadata.get("hasRequiredCapabilities", True))
                    
                    # Check for business data search in a location
                    # Detect both specific business types like "smoke shop" and general searches like "find businesses in X"
                    business_search_patterns = [
                        # General pattern: find X in Y
                        r"(?:find|search for|show me|get|locate|look up)\s+([a-zA-Z\s]+)\s+in\s+([a-zA-Z\s]+)",
                        # Specific pattern: X in Y
                        r"([a-zA-Z\s]+(?:shop|store|restaurant|cafe|business|company|hotel|bar)s?)\s+in\s+([a-zA-Z\s]+)"
                    ]
                    
                    matched_business_type = None
                    matched_location = None
                    
                    # Try the business search patterns
                    for pattern in business_search_patterns:
                        match = re.search(pattern, content.lower())
                        if match:
                            matched_business_type = match.group(1).strip()
                            matched_location = match.group(2).strip()
                            break
                    
                    # Specific check for smoke shop (backward compatibility)
                    is_smoke_shop_search = "smokeshop_data" in capabilities or "smoke shop" in content.lower() or "smokeshop" in content.lower()
                    
                    if is_smoke_shop_search or matched_business_type:
                        # If it's a smoke shop search but we didn't get the location from the patterns
                        if is_smoke_shop_search and not matched_location:
                            location_match = re.search(r"in\s+([A-Za-z\s]+)(?:,|\.|$|\s)", content)
                            matched_location = location_match.group(1) if location_match else None
                            matched_business_type = "smoke shop"
                            
                        if matched_location:
                            # Create a background task for the data gathering
                            import uuid
                            task_id = f"task_{uuid.uuid4().hex[:8]}"
                            
                            # Determine the business type
                            business_type = matched_business_type if matched_business_type else "business"
                            
                            # Create the task
                            task_details = {
                                "type": "business_research",
                                "business_type": business_type,
                                "location": matched_location,
                                "limit": 20,
                                "requested_by": session_id,
                                "agent": "daddy_data"  # Explicitly mark this as a Daddy Data task
                            }
                            
                            task_result = task_manager.create_task(task_id, task_details)
                            
                            # Prepare response with clearer Daddy Data agent reference
                            response = f"📊 **Daddy Data Agent Activated**\n\nI'm searching for {business_type} data in {matched_location}. I've delegated this task to the Daddy Data agent, which specializes in business research and contact information. It will compile phone numbers, addresses, business hours, and website URLs.\n\nYou can also check the Daddy Data Agent window directly for results. Task ID: {task_id}"
                            
                            # Add detailed thinking
                            thinking = f"Analyzing request: '{content}'\n\n"
                            thinking += f"Detected capabilities: {', '.join(capabilities)}\n\n"
                            thinking += f"Business type detected: {business_type}\n\n"
                            thinking += f"Location detected: {matched_location}\n\n"
                            thinking += f"Created background task: {task_id}\n\n"
                            thinking += "Delegating to Daddy Data agent which has business_research, data_collection, and contact_finder capabilities.\n\n"
                            thinking += "Task is now running in the background and will continue even if the user disconnects."
                        else:
                            response = "I'd be happy to help you find business data. Could you please specify which city or location you're interested in?"
                            thinking = "Request requires location specification for business data search."
                    
                    # Check if this is another common intent
                    elif "hello" in content.lower() or "hi" in content.lower():
                        response = "Hello! I'm your Panion assistant. How can I help you today?"
                        thinking = "Detected greeting. Responding with welcome message."
                        
                    elif "help" in content.lower():
                        response = "I can help with various tasks like:\n- Creating and monitoring goals\n- Managing agent teams\n- Providing system analytics\n- Answering questions about the Panion system\n- Web scraping data from online sources"
                        thinking = "Detected help request. Providing capabilities list."
                        
                    elif "goal" in content.lower() or "task" in content.lower():
                        response = "I can help you create a new goal or task. Would you like me to help you define the requirements and assign it to the most suitable agents?"
                        thinking = "Detected goal/task request. Offering goal creation assistance."
                        
                    elif "agent" in content.lower() or "team" in content.lower():
                        response = "We have several agents with different capabilities. I can help you form a team for a specific task or show you the available agents."
                        thinking = "Detected agent/team request. Offering team formation assistance."
                        
                    elif "stat" in content.lower() or "system" in content.lower():
                        response = f"The system is currently active. We have {len(AGENTS)} agents and 5 plugins available."
                        thinking = "Detected system status request. Providing system overview."
                        
                    # Handle based on capabilities
                    elif capabilities:
                        capability_responses = {
                            "data_analysis": "I'm analyzing the data you provided. I'll extract key insights and prepare visualizations as needed.",
                            "business_research": "I'm gathering business information and market data related to your query.",
                            "contact_finder": "I'm searching for contact information and will compile a structured database for you."
                        }
                        
                        # Check for web_research capability - only use if explicitly asked for online searching
                        # Look for explicit indicators that user wants online research
                        explicitly_wants_web_research = (
                            "search online" in content.lower() or 
                            "find online" in content.lower() or
                            "search the web" in content.lower() or
                            "look online" in content.lower() or
                            "find on the internet" in content.lower() or
                            "current information" in content.lower() or
                            "latest news" in content.lower()
                        )
                        
                        if "web_research" in capabilities and explicitly_wants_web_research:
                            response = "I'm researching this topic online to gather the most relevant and up-to-date information for you."
                            thinking = "Using capability: web_research to process your request."
                        else:
                            # Check if we match any other capabilities
                            match_found = False
                            for cap in capabilities:
                                # Skip web_research unless explicitly requested
                                if cap == "web_research" and not explicitly_wants_web_research:
                                    continue
                                    
                                if cap in capability_responses:
                                    response = capability_responses[cap]
                                    thinking = f"Using capability: {cap} to process your request."
                                    match_found = True
                                    break
                                    
                            if not match_found:
                                # Filter out web_research from the displayed capabilities unless explicitly requested
                                displayed_caps = [c for c in capabilities if c != "web_research" or explicitly_wants_web_research]
                                response = f"I'm working on your request that requires these capabilities: {', '.join(displayed_caps)}. I'll provide a detailed response shortly."
                                thinking = f"Processing request with capabilities: {', '.join(displayed_caps)}"
                            
                    # Handle web scraping requests
                    elif re.search(r"(scrape|find|get|collect|search).*(business|store|restaurant|shop|company)", content.lower()) or \
                         re.search(r"(business|store|restaurant|shop|company).*(info|data|details|phone|contact)", content.lower()):
                        
                        # Extract business type
                        business_type_match = re.search(r"(restaurant|cafe|coffee\s*shop|bar|grocery\s*store|clothing\s*store|electronic\s*store|hardware\s*store|bookstore|pharmacy|gym|salon|spa|hotel|bank|gas\s*station|theater|cinema)", content.lower())
                        business_type = business_type_match.group(1) if business_type_match else "business"
                        
                        # Extract location if specified
                        location_match = re.search(r"in\s+([A-Za-z\s]+)(?:,|\.|$|\s)", content)
                        location = location_match.group(1) if location_match else "New York"
                        
                        # Extract limit if specified
                        limit_match = re.search(r"(\d+)\s+(results|stores?|businesses|restaurants)", content)
                        limit = int(limit_match.group(1)) if limit_match else 10
                        limit = min(limit, 100)  # Cap at 100
                        
                        # Check for proxy or playwright mentions
                        use_proxy = True  # Default to using proxy
                        use_playwright = False
                        use_selenium = False
                        use_strategic = False
                        
                        if re.search(r"(using|with|via)\s+(proxy|proxies)", content.lower()):
                            use_proxy = True
                        elif re.search(r"(without|no)\s+(proxy|proxies)", content.lower()):
                            use_proxy = False
                        
                        if re.search(r"(using|with|via)\s+(playwright|browser|headless|chrome|firefox)", content.lower()):
                            use_playwright = True
                            
                        if re.search(r"(using|with|via)\s+(selenium|browser automation)", content.lower()):
                            use_selenium = True
                            
                        # Check for strategic/multi-approach requests
                        if re.search(r"(strategic|strategy|multiple approaches|compare|best approach|optimal|combine|multi-source)", content.lower()):
                            use_strategic = True
                        
                        # Prepare scraping method description
                        method_desc = []
                        if use_proxy:
                            method_desc.append("proxy rotation")
                        if use_playwright:
                            method_desc.append("Playwright browser automation")
                        if use_selenium:
                            method_desc.append("Selenium browser automation")
                        if use_strategic:
                            method_desc.append("strategic orchestration")
                        
                        method_text = ""
                        if method_desc:
                            method_text = f" using {' and '.join(method_desc)}"
                            
                        # Generate different responses based on strategic mode
                        if use_strategic:
                            # Import the strategy controller
                            try:
                                from scrapers.strategy_controller import get_controller
                                controller = get_controller()
                                
                                # Create a strategic goal
                                goal = f"Find information about {business_type}s in {location}"
                                parameters = {
                                    "business_type": business_type,
                                    "location": location,
                                    "limit": limit,
                                    "use_proxy": use_proxy,
                                    "use_playwright": use_playwright,
                                    "use_selenium": use_selenium
                                }
                                
                                # Execute the strategic goal asynchronously
                                import asyncio
                                operation_info = asyncio.run(controller.execute_strategic_goal(goal, parameters))
                                
                                # Return a response with the operation ID
                                response = f"I'll strategically gather information about {business_type}s in {location} using multiple data sources and approaches. I'll analyze which methods work best and combine the results for optimal coverage. Operation ID: {operation_info['operation_id']}"
                                thinking = f"Created strategic research operation {operation_info['operation_id']} for {business_type} in {location}. Using multiple scraping methods with strategic orchestration."
                                
                            except ImportError:
                                logger.error("Could not import strategy controller, falling back to standard response")
                                response = f"I'll gather information for {limit} {business_type}s in {location}{method_text}. I'll use multiple methods to compile this information for you."
                                thinking = f"Detected business information request for {business_type} in {location}. Using web research capabilities with proxy: {use_proxy}, playwright: {use_playwright}, selenium: {use_selenium}."
                        else:
                            # Standard response
                            response = f"I'll gather information for {limit} {business_type}s in {location}{method_text}. I'll use the Daddy Data agent to compile this information for you."
                            thinking = f"Detected business information request for {business_type} in {location}. Using web research capabilities with proxy: {use_proxy}, playwright: {use_playwright}, selenium: {use_selenium}."
                    
                    # Handle data analysis requests
                    elif re.search(r"(analyze|chart|graph|visualization|trend|plot|dashboard).*(data|csv|json|file|result)", content.lower()):
                        # Extract analysis type
                        analysis_type_match = re.search(r"(bar\s*chart|pie\s*chart|line\s*graph|histogram|scatter\s*plot|correlation|summary|statistics)", content.lower())
                        analysis_type = analysis_type_match.group(1) if analysis_type_match else "summary"
                        
                        response = f"I'll analyze your data and create a {analysis_type} visualization. I'll use data analysis capabilities to process this request."
                        thinking = f"Detected data analysis request for {analysis_type}. Using data analysis capabilities."
                    
                    # Default response for other types of messages
                    else:
                        response = f"I understand that you're asking about '{content}'. Let me analyze this and find the best way to help you with this request."
                        thinking = f"Processing general request: '{content}'"
                except Exception as e:
                    logger.error(f"Error processing chat message: {str(e)}")
                    response = "I apologize, but I encountered an error processing your request. Could you please try rephrasing it?"
                    thinking = f"Error during processing: {str(e)}"
                
                # Return the response
                try:
                    self._set_headers()
                    self.wfile.write(json.dumps({
                        "response": response,
                        "thinking": thinking,
                        "additional_info": {
                            "timestamp": datetime.datetime.now().isoformat(),
                            "session_id": session_id,
                            "intent_detected": detect_intent(content),
                            "confidence": 0.85,
                            "capabilities": capabilities
                        }
                    }).encode())
                except Exception as e:
                    logger.error(f"Error sending response: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "error": "Error sending response",
                        "message": str(e)
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
                use_proxy = data.get("use_proxy", True)
                use_playwright = data.get("use_playwright", False)
                
                # If playwright is specifically requested, use it directly
                if use_playwright:
                    source = "playwright"
                
                logger.info(f"Enhanced scraping request: {business_type} in {location}, using {source} strategy, limit {limit}, proxy: {use_proxy}, playwright: {use_playwright}")
                
                try:
                    # Import the enhanced scraper
                    try:
                        from scrapers.enhanced_scraper import EnhancedScraper
                        scraper = EnhancedScraper()
                        
                        # Show current status
                        self._set_headers()
                        self.wfile.write(json.dumps({
                            "status": "in_progress",
                            "message": f"Starting scraping for {business_type} in {location} using {source} strategy. This may take 30-60 seconds."
                        }).encode())
                        
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
                        
                        # If results are empty and Playwright wasn't already tried, use it as a fallback
                        if not results and source != "playwright" and use_playwright:
                            logger.info("No results with primary strategy, falling back to Playwright")
                            try:
                                results = scraper._try_playwright_scraping(
                                    business_type=business_type,
                                    location=location,
                                    limit=limit
                                )
                            except Exception as pw_e:
                                logger.error(f"Error using Playwright fallback: {str(pw_e)}")
                        
                        # Return successful response
                        self._set_headers()
                        self.wfile.write(json.dumps({
                            "status": "success",
                            "result_count": len(results),
                            "filepath": filepath,
                            "last_successful_strategy": getattr(scraper, "last_successful_strategy", None),
                            "use_proxy": use_proxy,
                            "use_playwright": use_playwright or source == "playwright",
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
            
            # Panion chat endpoint
            elif path == "/panion/chat":
                content = data.get("content", "")
                session_id = data.get("session_id", "default")
                user_id = data.get("user_id", "anonymous")
                
                logger.info(f"Panion chat request: {content}")
                
                # This would use the Panion emotional support agent
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
            
            # Panion goal creation endpoint
            elif path == "/panion/goal":
                content = data.get("content", "")
                session_id = data.get("session_id", "default")
                
                logger.info(f"Panion goal creation request: {content}")
                
                # This would use the Panion goal creation functionality
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
            
            # Panion goals list endpoint
            elif path == "/panion/goals":
                logger.info("Panion goals list request")
                
                # This would use the Panion goals system
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
                
            # Strategic operation status endpoint
            elif path == "/strategic/status":
                operation_id = data.get("operation_id", "")
                
                if not operation_id:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": "Operation ID is required"
                    }).encode())
                    return
                
                try:
                    # Import the strategy controller
                    from scrapers.strategy_controller import get_controller
                    controller = get_controller()
                    
                    # Get the operation status
                    status = controller.get_operation_status(operation_id)
                    
                    self._set_headers()
                    self.wfile.write(json.dumps(status).encode())
                    
                except ImportError as ie:
                    logger.error(f"Error importing strategy controller: {str(ie)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": "Strategic operation framework not available"
                    }).encode())
                except Exception as e:
                    logger.error(f"Error getting operation status: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": f"Error getting operation status: {str(e)}"
                    }).encode())
                    
            # Strategic operation results endpoint
            elif path == "/strategic/results":
                operation_id = data.get("operation_id", "")
                
                if not operation_id:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": "Operation ID is required"
                    }).encode())
                    return
                
                try:
                    # Import the strategy controller
                    from scrapers.strategy_controller import get_controller
                    controller = get_controller()
                    
                    # Get the operation results
                    results = controller.get_operation_result(operation_id)
                    
                    self._set_headers()
                    self.wfile.write(json.dumps(results).encode())
                    
                except ImportError as ie:
                    logger.error(f"Error importing strategy controller: {str(ie)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": "Strategic operation framework not available"
                    }).encode())
                except Exception as e:
                    logger.error(f"Error getting operation results: {str(e)}")
                    self._set_headers(500)
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": f"Error getting operation results: {str(e)}"
                    }).encode())
            
            # Panion dream expansion endpoint
            elif path == "/panion/expand-dream":
                goal_id = data.get("goal_id", "")
                content = data.get("content", "")
                
                logger.info(f"Panion dream expansion request for goal {goal_id}: {content}")
                
                # This would use the Panion dream expansion functionality
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