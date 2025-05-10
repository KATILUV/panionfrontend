#!/usr/bin/env python3
"""
Launcher for the Panion WebSocket Server
Starts the WebSocket server on port 8001
"""

import sys
import os
import logging
import asyncio
import websockets
import json
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global active connections
active_connections = set()

# Handle connections (v15.0.1 compatible - no path parameter)
async def handler(websocket):
    """Handle websocket connection"""
    try:
        logger.info("New connection established")
        active_connections.add(websocket)
        
        # Send welcome message
        await websocket.send(json.dumps({
            "type": "welcome",
            "message": "Connected to Panion WebSocket Server",
            "timestamp": time.time()
        }))
        
        # Process incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get("type", "unknown")
                message_id = data.get("id", f"auto_{time.time()}")
                
                logger.info(f"Received message: {message_type} (ID: {message_id})")
                
                # Simple echo response
                response = {
                    "id": message_id,
                    "type": f"{message_type}_response",
                    "data": {
                        "status": "success",
                        "message": f"Processed {message_type} message",
                        "timestamp": time.time()
                    }
                }
                
                await websocket.send(json.dumps(response))
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received")
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": "Invalid JSON message",
                    "timestamp": time.time()
                }))
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": str(e),
                    "timestamp": time.time()
                }))
                
    except Exception as e:
        logger.error(f"Connection error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
            logger.info("Connection closed")

# Heartbeat function
async def heartbeat():
    """Send periodic heartbeats to all connections"""
    while True:
        if active_connections:
            logger.info(f"Sending heartbeat to {len(active_connections)} clients")
            for websocket in active_connections.copy():
                try:
                    await websocket.send(json.dumps({
                        "type": "heartbeat",
                        "timestamp": time.time(),
                        "connections": len(active_connections)
                    }))
                except Exception:
                    # Connection probably closed
                    pass
        await asyncio.sleep(30)  # 30 second interval

# Main server function
async def start_server():
    """Start the WebSocket server"""
    port = 8001
    logger.info(f"Starting WebSocket server on port {port}")
    
    # Create the server
    async with websockets.serve(handler, "0.0.0.0", port):
        logger.info(f"WebSocket server started and listening on port {port}")
        
        # Start heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat())
        
        # Keep the server running
        await asyncio.Future()

if __name__ == "__main__":
    print("[websocket] Basic WebSocket server initialized")
    
    try:
        # Run the server
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("Server shut down by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error starting WebSocket server: {e}")
        sys.exit(1)