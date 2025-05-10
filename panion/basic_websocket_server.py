#!/usr/bin/env python3
"""
Basic WebSocket Server for Panion
A minimal, reliable implementation for WebSockets v15.0+
"""

import asyncio
import json
import logging
import sys
import time
import websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global active connections
active_connections = set()

# Handle connections - version 15+ compatible handler (no path parameter)
async def handler(websocket):
    """Handle a client connection"""
    logger.info(f"New connection established")
    active_connections.add(websocket)
    
    try:
        # Send welcome message
        await websocket.send(json.dumps({
            "type": "welcome",
            "message": "Connected to Panion WebSocket Server v15+",
            "timestamp": time.time()
        }))
        
        # Process messages
        async for message in websocket:
            try:
                # Parse the message
                data = json.loads(message)
                message_type = data.get("type", "unknown")
                message_id = data.get("id", f"auto_{time.time()}")
                
                logger.info(f"Received message: {message_type} (ID: {message_id})")
                
                # Echo response
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
                logger.error(f"Invalid JSON received: {message}")
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
        # Remove from active connections
        if websocket in active_connections:
            active_connections.remove(websocket)
            logger.info("Connection closed")

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

async def main():
    """Main entry point for the WebSocket server"""
    logger.info("Starting WebSocket server on port 8001")
    
    # Start the WebSocket server (WebSockets v15.0+ syntax)
    async with websockets.server.serve(handler, "0.0.0.0", 8001):
        logger.info("WebSocket server started successfully")
        
        # Start the heartbeat task
        heartbeat_task = asyncio.create_task(heartbeat())
        
        # Keep the server running forever
        await asyncio.Future()

if __name__ == "__main__":
    print("[websocket] Basic WebSocket server initializing (WebSockets v15+)")
    try:
        # Create a new event loop
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutdown by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error starting WebSocket server: {e}")
        sys.exit(1)