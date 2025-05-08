import logging
import json
import pika
import redis
from typing import Dict, List, Optional, Callable
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
import threading

@dataclass
class Message:
    sender: str
    recipient: str
    content: Dict
    timestamp: str
    message_id: str
    priority: int = 0

class MessagingSystem:
    def __init__(self, rabbitmq_host: str = "localhost", redis_host: str = "localhost"):
        self.rabbitmq_host = rabbitmq_host
        self.redis_host = redis_host
        self.logger = logging.getLogger("MessagingSystem")
        self._setup_logging()
        self._setup_rabbitmq()
        self._setup_redis()
        self.message_handlers: Dict[str, List[Callable]] = {}
    
    def _setup_logging(self) -> None:
        log_file = Path("logs") / "messaging_system.log"
        log_file.parent.mkdir(exist_ok=True)
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        self.logger.addHandler(handler)
    
    def _setup_rabbitmq(self) -> None:
        """Setup RabbitMQ connection and channels."""
        try:
            self.rabbitmq_connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=self.rabbitmq_host)
            )
            self.channel = self.rabbitmq_connection.channel()
            self.channel.exchange_declare(
                exchange='agent_messages',
                exchange_type='topic'
            )
            self.logger.info("RabbitMQ connection established")
        except Exception as e:
            self.logger.error(f"Error setting up RabbitMQ: {str(e)}")
            raise
    
    def _setup_redis(self) -> None:
        """Setup Redis connection."""
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=6379,
                db=0
            )
            self.logger.info("Redis connection established")
        except Exception as e:
            self.logger.error(f"Error setting up Redis: {str(e)}")
            raise
    
    def send_message(self, message: Message) -> None:
        """Send a message to a recipient."""
        try:
            # Store message in Redis
            message_key = f"message:{message.message_id}"
            self.redis_client.hset(
                message_key,
                mapping=asdict(message)
            )
            
            # Publish to RabbitMQ
            routing_key = f"agent.{message.recipient}"
            self.channel.basic_publish(
                exchange='agent_messages',
                routing_key=routing_key,
                body=json.dumps(asdict(message))
            )
            
            self.logger.info(f"Sent message to {message.recipient}")
        except Exception as e:
            self.logger.error(f"Error sending message: {str(e)}")
    
    def register_handler(self, agent_id: str, handler: Callable) -> None:
        """Register a message handler for an agent."""
        if agent_id not in self.message_handlers:
            self.message_handlers[agent_id] = []
        
        self.message_handlers[agent_id].append(handler)
        self.logger.info(f"Registered handler for agent {agent_id}")
    
    def start_consuming(self, agent_id: str) -> None:
        """Start consuming messages for an agent."""
        try:
            queue_name = f"agent_queue_{agent_id}"
            self.channel.queue_declare(queue=queue_name)
            self.channel.queue_bind(
                exchange='agent_messages',
                queue=queue_name,
                routing_key=f"agent.{agent_id}"
            )
            
            def callback(ch, method, properties, body):
                try:
                    message_data = json.loads(body)
                    message = Message(**message_data)
                    
                    if agent_id in self.message_handlers:
                        for handler in self.message_handlers[agent_id]:
                            handler(message)
                    
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    self.logger.error(f"Error processing message: {str(e)}")
            
            self.channel.basic_consume(
                queue=queue_name,
                on_message_callback=callback
            )
            
            # Start consuming in a separate thread
            thread = threading.Thread(target=self.channel.start_consuming)
            thread.daemon = True
            thread.start()
            
            self.logger.info(f"Started consuming messages for agent {agent_id}")
        except Exception as e:
            self.logger.error(f"Error starting message consumption: {str(e)}")
    
    def get_message_history(self, agent_id: str, limit: int = 100) -> List[Message]:
        """Get message history for an agent."""
        try:
            pattern = f"message:*"
            message_keys = self.redis_client.keys(pattern)
            messages = []
            
            for key in message_keys:
                message_data = self.redis_client.hgetall(key)
                if message_data:
                    message = Message(**{
                        k.decode(): v.decode() if isinstance(v, bytes) else v
                        for k, v in message_data.items()
                    })
                    if message.recipient == agent_id or message.sender == agent_id:
                        messages.append(message)
            
            messages.sort(key=lambda x: x.timestamp, reverse=True)
            return messages[:limit]
        except Exception as e:
            self.logger.error(f"Error getting message history: {str(e)}")
            return []
    
    def cleanup(self) -> None:
        """Cleanup connections."""
        try:
            self.rabbitmq_connection.close()
            self.redis_client.close()
            self.logger.info("Cleaned up messaging connections")
        except Exception as e:
            self.logger.error(f"Error during cleanup: {str(e)}")

# Create global instance
messaging_system = MessagingSystem() 