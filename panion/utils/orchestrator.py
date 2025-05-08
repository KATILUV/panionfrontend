import asyncio
import threading
import logging
from datetime import datetime
import time
from typing import Dict, List, Any, Optional
from enum import Enum

from ..config import SystemConfig
from ..autonomous_system import AutonomousSystem
from ..planning_system import PlanningSystem
from ..capability_registry import CapabilityRegistry
from ..panion_core.panion_plugins import PluginManager
from ..version_manager import VersionManager
from ..resource_manager import ResourceManager
from ..error_diagnosis import ErrorDiagnosis
from ..context_memory import ContextMemory
from ..memory_hub import memory_hub, MemoryType
from ..self_repair_system_singleton import get_instance as get_self_repair_system
from .communication_system import communication_system, MessageType

class SystemStatus(Enum):
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"
    SHUTTING_DOWN = "shutting_down"

@dataclass
class SystemConfig:
    data_dir: str = "data"
    logs_dir: str = "logs"
    plugins_dir: str = "plugins"
    rabbitmq_host: str = "localhost"
    redis_host: str = "localhost"
    max_concurrent_actions: int = 5
    health_check_interval: int = 300  # seconds
    cleanup_interval: int = 3600  # seconds
    max_memory_usage: float = 0.8  # 80%
    max_cpu_usage: float = 0.8  # 80%

class Orchestrator:
    def __init__(self, config: SystemConfig):
        self.config = config
        self._setup_logging()
        self.memory_hub = memory_hub
        
        # Initialize core systems
        self.autonomous_system = AutonomousSystem(self.memory_hub)
        self.planning_system = PlanningSystem(self.memory_hub)
        self.capability_registry = CapabilityRegistry(self.memory_hub)
        self.plugin_manager = PluginManager(self.memory_hub)
        self.version_manager = VersionManager(self.memory_hub)
        self.resource_manager = ResourceManager(self.memory_hub)
        self.error_diagnosis = ErrorDiagnosis(self.memory_hub)
        self.self_repair = get_self_repair_system()
        self.communication = communication_system
        
        self.running = False
        self.cleanup_thread = None
        self._lock = threading.Lock()
        self._message_handlers = {
            MessageType.COMMAND: self._handle_command,
            MessageType.RESPONSE: self._handle_response,
            MessageType.HEARTBEAT: self._handle_heartbeat
        }
    
    def _setup_logging(self) -> None:
        """Setup logging for orchestrator."""
        log_file = Path(self.config.logs_dir) / "orchestrator.log"
        log_file.parent.mkdir(exist_ok=True)
        
        self.logger = logging.getLogger("Orchestrator")
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _setup_directories(self) -> None:
        """Create necessary directories."""
        for dir_path in [self.config.data_dir, self.config.logs_dir, self.config.plugins_dir]:
            Path(dir_path).mkdir(exist_ok=True)
    
    async def initialize(self) -> None:
        """Initialize all systems with enhanced error handling."""
        try:
            self.logger.info("Initializing systems...")
            
            # Create initial snapshot
            snapshot_id = await self.memory_hub.create_snapshot(
                description="System initialization",
                memory_types=[MemoryType.PLUGIN, MemoryType.CAPABILITY]
            )
            
            try:
                # Initialize systems in order of dependency
                await self.plugin_manager.initialize()
                await self.version_manager.initialize()
                await self.capability_registry.initialize()
                await self.resource_manager.initialize()
                await self.error_diagnosis.initialize()
                await self.self_repair.initialize()
                await self.communication.initialize()
                
                # Setup scheduled tasks
                self._setup_scheduled_tasks()
                
                # Start message processing
                asyncio.create_task(self._process_messages())
                
                self.status = SystemStatus.RUNNING
                self.logger.info("All systems initialized successfully")
            
            except Exception as e:
                # Restore snapshot on initialization error
                await self.memory_hub.restore_snapshot(snapshot_id)
                raise
        
        except Exception as e:
            self.status = SystemStatus.ERROR
            self.logger.error(f"Error during initialization: {str(e)}")
            raise
    
    def _setup_scheduled_tasks(self) -> None:
        """Setup scheduled maintenance tasks."""
        # Health check
        schedule.every(self.config.health_check_interval).seconds.do(
            self._run_health_check
        )
        
        # Cleanup tasks
        schedule.every(self.config.cleanup_interval).seconds.do(
            self._run_cleanup_tasks
        )
        
        # Self-improvement
        schedule.every().day.at("02:00").do(
            self._run_self_improvement
        )
    
    async def _run_health_check(self) -> None:
        """Run system health check."""
        try:
            self.logger.info("Running health check...")
            
            # Check resource usage
            resource_status = await self.resource_manager.check_resources()
            if not resource_status.is_healthy:
                self.logger.warning(f"Resource issues detected: {resource_status.issues}")
            
            # Check system status
            system_status = await self._check_system_status()
            if not system_status.get("is_healthy", True):
                self.logger.warning(f"System issues detected: {system_status.get('issues', [])}")
            
            self.logger.info("Health check completed")
        
        except Exception as e:
            self.logger.error(f"Error during health check: {str(e)}")
    
    async def _run_cleanup_tasks(self) -> None:
        """Run system cleanup tasks."""
        try:
            self.logger.info("Running cleanup tasks...")
            
            # Create snapshot before cleanup
            await self.memory_hub.create_snapshot(
                description="Pre-cleanup snapshot",
                memory_types=[
                    MemoryType.PLUGIN,
                    MemoryType.CAPABILITY,
                    MemoryType.GOAL,
                    MemoryType.CONTEXT
                ]
            )
            
            # Cleanup old data
            await self.memory_hub.cleanup_old_snapshots()
            
            self.logger.info("Cleanup tasks completed")
        
        except Exception as e:
            self.logger.error(f"Error during cleanup: {str(e)}")
    
    async def _run_self_improvement(self) -> None:
        """Run self-improvement tasks."""
        try:
            self.logger.info("Running self-improvement tasks...")
            
            # Analyze performance
            performance_data = await self._analyze_performance()
            
            # Generate improvement goals
            improvement_goals = await self._generate_improvement_goals(performance_data)
            
            # Add goals to planning system
            for goal in improvement_goals:
                await self.planning_system.create_goal(
                    description=goal["description"],
                    priority=goal["priority"]
                )
            
            self.logger.info("Self-improvement tasks completed")
        
        except Exception as e:
            self.logger.error(f"Error during self-improvement: {str(e)}")
    
    async def start(self) -> None:
        """Start the orchestrator."""
        try:
            await self.initialize()
            
            # Start main loop
            self._main_loop_thread = threading.Thread(target=self._main_loop)
            self._main_loop_thread.daemon = True
            self._main_loop_thread.start()
            
            self.logger.info("Orchestrator started")
        
        except Exception as e:
            self.status = SystemStatus.ERROR
            self.logger.error(f"Error starting orchestrator: {str(e)}")
            raise
    
    def stop(self) -> None:
        """Stop the orchestrator."""
        try:
            self.status = SystemStatus.SHUTTING_DOWN
            self._stop_main_loop = True
            
            if self._main_loop_thread:
                self._main_loop_thread.join()
            
            self.logger.info("Orchestrator stopped")
        
        except Exception as e:
            self.logger.error(f"Error stopping orchestrator: {str(e)}")
            raise
    
    def _main_loop(self) -> None:
        """Main orchestration loop."""
        try:
            while not self._stop_main_loop:
                # Run scheduled tasks
                schedule.run_pending()
                
                # Process action queue
                asyncio.run(self._process_action_queue())
                
                # Check system status
                asyncio.run(self._check_system_status())
                
                time.sleep(1)  # Prevent CPU spinning
        
        except Exception as e:
            self.status = SystemStatus.ERROR
            self.logger.error(f"Error in main loop: {str(e)}")
    
    async def _process_action_queue(self) -> None:
        """Process actions from the queue with enhanced monitoring."""
        try:
            while not self._action_queue.empty():
                action = await self._action_queue.get()
                
                # Check resources before executing
                if not await self.resource_manager.check_resources():
                    self.logger.warning("Resource limits reached, pausing action processing")
                    break
                
                # Track action start time for stuck detection
                start_time = time.time()
                action["start_time"] = start_time
                
                # Execute action
                await self._execute_action(action)
                
                # Check for stuck goals
                if action.get("type") == "goal" and time.time() - start_time > 1800:  # 30 minutes
                    await self.self_repair.handle_stuck_goal(
                        action["goal_id"],
                        action.get("progress", 0)
                    )
                
                self._action_queue.task_done()
        
        except Exception as e:
            self.logger.error(f"Error processing action queue: {str(e)}")
    
    async def _execute_action(self, action: Dict[str, Any]) -> None:
        """Execute an action with enhanced error handling and recovery."""
        try:
            # Create snapshot before risky action
            snapshot_id = await self.memory_hub.create_snapshot(
                description=f"Pre-action snapshot: {action.get('action', 'unknown')}",
                memory_types=[MemoryType.PLUGIN, MemoryType.CAPABILITY]
            )
            
            try:
                # Check capability
                capability = self.capability_registry.get_capability(action["capability_id"])
                if not capability:
                    raise ValueError(f"Capability {action['capability_id']} not found")
                
                # Validate action
                validation_results = await self.capability_registry.validate_capability(
                    action["capability_id"]
                )
                if not all(result["passed"] for result in validation_results):
                    raise ValueError("Action validation failed")
                
                # Execute action through autonomous system
                result = await self.autonomous_system.execute_action(action)
                
                # Record result in context memory
                await self.memory_hub.store(
                    MemoryType.CONTEXT,
                    f"action_{int(time.time())}",
                    {
                        "context": action,
                        "action": capability["name"],
                        "result": result,
                        "success": result.get("success", False),
                        "timestamp": datetime.now().isoformat()
                    }
                )
                
                # Add relationship between capability and result
                await self.memory_hub.add_relationship(
                    source_id=action["capability_id"],
                    target_id=f"action_{int(time.time())}",
                    relationship_type="execution",
                    strength=1.0 if result.get("success", False) else 0.5
                )
            
            except Exception as e:
                # Handle plugin errors
                if "plugin_id" in action:
                    await self.self_repair.handle_plugin_crash(action["plugin_id"], e)
                
                # Restore snapshot on error
                await self.memory_hub.restore_snapshot(snapshot_id)
                raise
        
        except Exception as e:
            self.logger.error(f"Error executing action: {str(e)}")
            await self.error_diagnosis.record_error(e, context=action)
    
    async def handle_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Handle an incoming command."""
        try:
            # Validate command
            if not self._validate_command(command):
                raise ValueError("Invalid command")
            
            # Check resources
            if not await self.resource_manager.check_resources():
                raise ResourceError("System resources exceeded")
            
            # Add to action queue
            await self._action_queue.put(command)
            
            return {"status": "queued", "message": "Command queued for execution"}
        
        except Exception as e:
            self.logger.error(f"Error handling command: {str(e)}")
            await self.error_diagnosis.record_error(e, context=command)
            raise
    
    def _validate_command(self, command: Dict[str, Any]) -> bool:
        """Validate a command."""
        required_fields = ["action", "capability_id", "parameters"]
        return all(field in command for field in required_fields)
    
    async def _check_system_status(self) -> Dict[str, Any]:
        """Check status of all systems with enhanced error handling."""
        status = {
            "overall": self.status.value,
            "systems": {},
            "issues": []
        }
        
        # Check each system
        systems = {
            "autonomous_system": self.autonomous_system,
            "planning_system": self.planning_system,
            "capability_registry": self.capability_registry,
            "plugin_manager": self.plugin_manager,
            "version_manager": self.version_manager,
            "resource_manager": self.resource_manager,
            "error_diagnosis": self.error_diagnosis,
            "self_repair": self.self_repair
        }
        
        for name, system in systems.items():
            try:
                system_status = await system.get_status()
                status["systems"][name] = system_status
                
                if not system_status.get("is_healthy", True):
                    status["issues"].append({
                        "system": name,
                        "issue": system_status.get("issue", "Unknown issue")
                    })
            
            except Exception as e:
                status["systems"][name] = {"status": "error", "error": str(e)}
                status["issues"].append({
                    "system": name,
                    "issue": f"Error checking status: {str(e)}"
                })
        
        # Handle health check failures
        if status["issues"]:
            await self.self_repair.handle_health_check_failure(status["issues"])
        
        return status
    
    async def _analyze_performance(self) -> Dict[str, Any]:
        """Analyze system performance."""
        try:
            # Get memory stats
            memory_stats = await self.memory_hub.get_memory_stats()
            
            performance = {
                "resource_usage": await self.resource_manager.get_usage_history(),
                "error_rates": await self.error_diagnosis.get_error_trends(),
                "capability_success": await self.capability_registry.get_success_rates(),
                "memory_usage": memory_stats
            }
            
            return performance
        
        except Exception as e:
            self.logger.error(f"Error analyzing performance: {str(e)}")
            return {}
    
    async def _generate_improvement_goals(self, performance_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate improvement goals based on performance data."""
        goals = []
        
        # Analyze resource usage
        if performance_data["resource_usage"]["cpu"] > self.config.max_cpu_usage:
            goals.append({
                "description": "Optimize CPU usage",
                "priority": 3
            })
        
        if performance_data["resource_usage"]["memory"] > self.config.max_memory_usage:
            goals.append({
                "description": "Optimize memory usage",
                "priority": 3
            })
        
        # Analyze error rates
        if performance_data["error_rates"]["critical"] > 0:
            goals.append({
                "description": "Address critical errors",
                "priority": 1
            })
        
        # Analyze capability success rates
        for capability, rate in performance_data["capability_success"].items():
            if rate < 0.8:  # 80% success rate threshold
                goals.append({
                    "description": f"Improve {capability} success rate",
                    "priority": 2
                })
        
        return goals

    async def _process_messages(self):
        """Process incoming messages."""
        while self.running:
            try:
                message = await self.communication.receive_message()
                if message:
                    handler = self._message_handlers.get(message.type)
                    if handler:
                        await handler(message)
            
            except Exception as e:
                self.logger.error(f"Error processing message: {str(e)}")
                await asyncio.sleep(1)

    async def _handle_command(self, message: Message) -> None:
        """Handle incoming command messages."""
        try:
            # Validate command
            if not self._validate_command(message.payload):
                await self.communication.send_message(
                    MessageType.NACK,
                    {"error": "Invalid command"},
                    message.metadata.goal_id
                )
                return
            
            # Check resources
            if not await self.resource_manager.check_resources():
                await self.communication.send_message(
                    MessageType.NACK,
                    {"error": "System resources exceeded"},
                    message.metadata.goal_id
                )
                return
            
            # Add to action queue
            await self._action_queue.put(message.payload)
            
            # Send ACK
            await self.communication.send_message(
                MessageType.ACK,
                {"status": "queued"},
                message.metadata.goal_id
            )
            
        except Exception as e:
            self.logger.error(f"Error handling command: {str(e)}")
            await self.error_diagnosis.record_error(e, context=message.payload)
            
            # Send NACK
            await self.communication.send_message(
                MessageType.NACK,
                {"error": str(e)},
                message.metadata.goal_id
            )

    async def _handle_response(self, message: Message) -> None:
        """Handle incoming response messages."""
        try:
            # Store response in context memory
            await self.memory_hub.store(
                MemoryType.CONTEXT,
                f"response_{message.metadata.message_id}",
                {
                    "response": message.payload,
                    "timestamp": message.metadata.timestamp,
                    "goal_id": message.metadata.goal_id
                }
            )
            
        except Exception as e:
            self.logger.error(f"Error handling response: {str(e)}")
            await self.error_diagnosis.record_error(e, context=message.payload)

    async def _handle_heartbeat(self, message: Message) -> None:
        """Handle incoming heartbeat messages."""
        try:
            # Update agent status
            await self.memory_hub.store(
                MemoryType.CONTEXT,
                f"agent_status_{message.metadata.sender_id}",
                {
                    "status": message.payload["status"],
                    "last_seen": message.metadata.timestamp
                }
            )
            
        except Exception as e:
            self.logger.error(f"Error handling heartbeat: {str(e)}")

    async def send_command(self, command: Dict[str, Any], goal_id: Optional[str] = None) -> str:
        """Send a command with guaranteed delivery."""
        try:
            message_id = await self.communication.send_message(
                MessageType.COMMAND,
                command,
                goal_id
            )
            
            return message_id
            
        except Exception as e:
            self.logger.error(f"Error sending command: {str(e)}")
            raise

    async def send_response(self, response: Dict[str, Any], original_message_id: str, 
                          goal_id: Optional[str] = None) -> str:
        """Send a response with guaranteed delivery."""
        try:
            message_id = await self.communication.send_message(
                MessageType.RESPONSE,
                {
                    "response": response,
                    "original_message_id": original_message_id
                },
                goal_id
            )
            
            return message_id
            
        except Exception as e:
            self.logger.error(f"Error sending response: {str(e)}")
            raise

# Create global instance
orchestrator = Orchestrator() 