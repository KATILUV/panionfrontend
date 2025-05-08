import zmq
import json
import time
import logging
import hashlib
import hmac
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import threading
from pathlib import Path

from memory_hub import memory_hub, MemoryType

class MessageType(Enum):
    COMMAND = "command"
    RESPONSE = "response"
    ACK = "ack"
    NACK = "nack"
    HEARTBEAT = "heartbeat"

@dataclass
class MessageMetadata:
    sender_id: str
    timestamp: str
    goal_id: Optional[str] = None
    message_id: str = None
    retry_count: int = 0
    signature: str = None

@dataclass
class Message:
    type: MessageType
    metadata: MessageMetadata
    payload: Dict[str, Any]

class CommunicationSystem:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.logger = logging.getLogger("CommunicationSystem")
        self._setup_logging()
        
        # ZMQ setup
        self.context = zmq.Context()
        self.socket = self.context.socket(zmq.DEALER)
        self.socket.setsockopt(zmq.LINGER, 0)
        self.socket.setsockopt(zmq.RCVTIMEO, self.config.get("receive_timeout", 5000))
        
        # Message tracking
        self._pending_messages: Dict[str, Message] = {}
        self._message_history: Dict[str, List[Dict[str, Any]]] = {}
        self._retry_queue: asyncio.Queue = asyncio.Queue()
        
        # Security
        self._secret_key = self.config.get("secret_key", "default_key").encode()
        
        # Thread safety
        self._lock = threading.Lock()
        self._running = False
        
    def _setup_logging(self):
        handler = logging.FileHandler("logs/communication.log")
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
        
    async def initialize(self):
        """Initialize the communication system."""
        try:
            # Connect to broker
            self.socket.connect(self.config["broker_address"])
            
            # Start retry worker
            self._running = True
            asyncio.create_task(self._retry_worker())
            
            # Start heartbeat
            asyncio.create_task(self._send_heartbeat())
            
            self.logger.info("Communication system initialized")
            
        except Exception as e:
            self.logger.error(f"Error initializing communication system: {str(e)}")
            raise
            
    async def shutdown(self):
        """Shutdown the communication system."""
        try:
            self._running = False
            self.socket.close()
            self.context.term()
            self.logger.info("Communication system shutdown")
            
        except Exception as e:
            self.logger.error(f"Error shutting down communication system: {str(e)}")
            raise
            
    async def send_message(self, message_type: MessageType, payload: Dict[str, Any], 
                          goal_id: Optional[str] = None) -> str:
        """Send a message with guaranteed delivery."""
        try:
            # Create message
            message_id = self._generate_message_id()
            metadata = MessageMetadata(
                sender_id=self.config["agent_id"],
                timestamp=datetime.now().isoformat(),
                goal_id=goal_id,
                message_id=message_id
            )
            
            message = Message(
                type=message_type,
                metadata=metadata,
                payload=payload
            )
            
            # Sign message
            self._sign_message(message)
            
            # Store in pending messages
            with self._lock:
                self._pending_messages[message_id] = message
            
            # Send message
            await self._send_with_retry(message)
            
            return message_id
            
        except Exception as e:
            self.logger.error(f"Error sending message: {str(e)}")
            raise
            
    async def _send_with_retry(self, message: Message, retry_count: int = 0) -> bool:
        """Send a message with retry logic."""
        try:
            # Serialize message
            message_data = json.dumps(asdict(message)).encode()
            
            # Send message
            self.socket.send(message_data)
            
            # Wait for ACK
            ack_received = await self._wait_for_ack(message.metadata.message_id)
            
            if not ack_received:
                if retry_count < self.config.get("max_retries", 3):
                    # Add to retry queue
                    message.metadata.retry_count = retry_count + 1
                    await self._retry_queue.put(message)
                    return False
                else:
                    # Max retries reached
                    self.logger.warning(f"Max retries reached for message {message.metadata.message_id}")
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error in send with retry: {str(e)}")
            return False
            
    async def _wait_for_ack(self, message_id: str, timeout: int = 5000) -> bool:
        """Wait for ACK/NACK for a message."""
        try:
            start_time = time.time()
            
            while time.time() - start_time < timeout / 1000:
                try:
                    response = self.socket.recv_json()
                    
                    if response["type"] == MessageType.ACK.value:
                        if response["metadata"]["message_id"] == message_id:
                            return True
                    elif response["type"] == MessageType.NACK.value:
                        if response["metadata"]["message_id"] == message_id:
                            return False
                
                except zmq.Again:
                    await asyncio.sleep(0.1)
                    continue
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error waiting for ACK: {str(e)}")
            return False
            
    async def _retry_worker(self):
        """Worker thread for retrying failed messages."""
        while self._running:
            try:
                message = await self._retry_queue.get()
                
                if message.metadata.retry_count < self.config.get("max_retries", 3):
                    success = await self._send_with_retry(
                        message, 
                        message.metadata.retry_count
                    )
                    
                    if not success:
                        # Store failed message
                        await self.memory_hub.store(
                            MemoryType.CONTEXT,
                            f"failed_message_{message.metadata.message_id}",
                            {
                                "message": asdict(message),
                                "retry_count": message.metadata.retry_count,
                                "timestamp": datetime.now().isoformat()
                            }
                        )
                
                self._retry_queue.task_done()
                
            except Exception as e:
                self.logger.error(f"Error in retry worker: {str(e)}")
                await asyncio.sleep(1)
                
    async def _send_heartbeat(self):
        """Send periodic heartbeat messages."""
        while self._running:
            try:
                await self.send_message(
                    MessageType.HEARTBEAT,
                    {"status": "alive"}
                )
                await asyncio.sleep(self.config.get("heartbeat_interval", 30))
                
            except Exception as e:
                self.logger.error(f"Error sending heartbeat: {str(e)}")
                await asyncio.sleep(1)
                
    def _generate_message_id(self) -> str:
        """Generate a unique message ID."""
        return hashlib.sha256(
            f"{self.config['agent_id']}_{time.time()}_{id(self)}".encode()
        ).hexdigest()
        
    def _sign_message(self, message: Message) -> None:
        """Sign a message with HMAC."""
        try:
            # Create signature data
            signature_data = f"{message.metadata.sender_id}{message.metadata.timestamp}{message.metadata.message_id}"
            
            # Generate signature
            signature = hmac.new(
                self._secret_key,
                signature_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            message.metadata.signature = signature
            
        except Exception as e:
            self.logger.error(f"Error signing message: {str(e)}")
            raise
            
    def _verify_message(self, message: Message) -> bool:
        """Verify message signature."""
        try:
            if not message.metadata.signature:
                return False
                
            # Create signature data
            signature_data = f"{message.metadata.sender_id}{message.metadata.timestamp}{message.metadata.message_id}"
            
            # Generate expected signature
            expected_signature = hmac.new(
                self._secret_key,
                signature_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(
                message.metadata.signature,
                expected_signature
            )
            
        except Exception as e:
            self.logger.error(f"Error verifying message: {str(e)}")
            return False
            
    async def receive_message(self) -> Optional[Message]:
        """Receive a message with verification."""
        try:
            # Receive message
            message_data = self.socket.recv_json()
            
            # Deserialize message
            message = Message(
                type=MessageType(message_data["type"]),
                metadata=MessageMetadata(**message_data["metadata"]),
                payload=message_data["payload"]
            )
            
            # Verify message
            if not self._verify_message(message):
                self.logger.warning(f"Invalid message signature from {message.metadata.sender_id}")
                return None
                
            # Send ACK
            await self.send_message(
                MessageType.ACK,
                {"original_message_id": message.metadata.message_id}
            )
            
            # Store in history
            with self._lock:
                if message.metadata.sender_id not in self._message_history:
                    self._message_history[message.metadata.sender_id] = []
                self._message_history[message.metadata.sender_id].append(asdict(message))
            
            return message
            
        except zmq.Again:
            return None
            
        except Exception as e:
            self.logger.error(f"Error receiving message: {str(e)}")
            return None
            
    def get_message_history(self, sender_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get message history for a sender or all senders."""
        with self._lock:
            if sender_id:
                return self._message_history.get(sender_id, [])
            return [
                message
                for messages in self._message_history.values()
                for message in messages
            ]

# Create global instance
communication_system = CommunicationSystem({
    "agent_id": "clara_agent",
    "broker_address": "tcp://localhost:5555",
    "secret_key": "your_secret_key_here",
    "max_retries": 3,
    "receive_timeout": 5000,
    "heartbeat_interval": 30
}) 