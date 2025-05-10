"""
Panion WebSocket Server compatible with websockets v15.0+
Provides bidirectional communication with enhanced capabilities
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

# Active connections
active_connections = set()

# Simple adapter pattern that works with newer websockets versions
class ConnectionAdapter:
    def __init__(self, websocket):
        self.websocket = websocket
        
    async def send(self, message):
        await self.websocket.send(message)
        
    async def close(self):
        await self.websocket.close()

# Handler for messages
async def handle_message(connection, message):
    """Handle an incoming message"""
    try:
        data = json.loads(message)
        message_id = data.get("id", "unknown")
        message_type = data.get("type", "unknown")
        
        logger.info(f"Received message {message_id} of type {message_type}")
        
        # Simple echo for now - customize based on message_type
        response = {
            "id": message_id,
            "type": f"{message_type}_response",
            "data": {
                "status": "success",
                "message": f"Received {message_type} message",
                "timestamp": time.time()
            }
        }
        
        await connection.send(json.dumps(response))
        
    except json.JSONDecodeError:
        logger.error("Invalid JSON received")
        await connection.send(json.dumps({
            "type": "error", 
            "error": "Invalid JSON"
        }))
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        await connection.send(json.dumps({
            "id": "unknown",
            "type": "error",
            "error": str(e)
        }))

# Connection handler with path parameter for older websockets compatibility
async def handler(websocket, path=None):
    """Handle a connection with path param for compatibility"""
    connection = ConnectionAdapter(websocket)
    active_connections.add(connection)
    logger.info(f"New WebSocket connection established on path: {path}")
    
    try:
        async for message in websocket:
            await handle_message(connection, message)
    except websockets.exceptions.ConnectionClosed:
        logger.info("WebSocket connection closed")
    finally:
        # Remove from active connections if it's still there
        if connection in active_connections:
            active_connections.remove(connection)

async def periodic_heartbeat():
    """Send periodic heartbeats to all connected clients"""
    while True:
        try:
            if active_connections:
                logger.debug(f"Sending heartbeat to {len(active_connections)} clients")
                
                connections_to_remove = set()
                for connection in active_connections:
                    try:
                        heartbeat = {
                            "id": f"heartbeat_{time.time()}",
                            "type": "heartbeat",
                            "data": {
                                "timestamp": time.time(),
                                "active_connections": len(active_connections)
                            }
                        }
                        await connection.send(json.dumps(heartbeat))
                    except Exception:
                        connections_to_remove.add(connection)
                
                # Clean up closed connections
                for connection in connections_to_remove:
                    active_connections.remove(connection)
            
            await asyncio.sleep(30)  # Send heartbeat every 30 seconds
            
        except Exception as e:
            logger.error(f"Error in heartbeat task: {str(e)}")
            await asyncio.sleep(5)  # Wait a bit on error

def start_server():
    """Start the WebSocket server"""
    async def main():
        # Start the server
        port = 8001
        async with serve(handler, "0.0.0.0", port):
            logger.info(f"WebSocket server running on port {port}")
            
            # Start the heartbeat task
            asyncio.create_task(periodic_heartbeat())
            
            # Keep the server running
            await asyncio.Future()  # Run forever
    
    # Set up the event loop
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutting down")
    except Exception as e:
        logger.error(f"Error running server: {e}")

if __name__ == "__main__":
    print("Starting WebSocket Server on port 8001...")
    start_server()