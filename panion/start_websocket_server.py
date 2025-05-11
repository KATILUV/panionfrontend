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
import signal
from typing import Set, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global active connections with metadata
active_connections: Set[Any] = set()
connection_metadata: Dict[Any, Dict[str, Any]] = {}

# Server stats
server_stats = {
    "start_time": time.time(),
    "total_connections": 0,
    "messages_received": 0,
    "messages_sent": 0,
    "errors": 0,
    "last_error": None
}

# Handle connections (v15.0.1 compatible - no path parameter)
async def handler(websocket):
    """Handle websocket connection"""
    try:
        client_id = f"client_{int(time.time() * 1000)}"
        client_info = {
            "id": client_id,
            "connected_at": time.time(),
            "last_activity": time.time(),
            "messages_received": 0,
            "messages_sent": 1  # Including welcome message
        }
        
        logger.info(f"New connection established: {client_id}")
        active_connections.add(websocket)
        connection_metadata[websocket] = client_info
        server_stats["total_connections"] += 1
        
        # Send welcome message
        await websocket.send(json.dumps({
            "type": "welcome",
            "client_id": client_id,
            "message": "Connected to Panion WebSocket Server",
            "timestamp": time.time(),
            "server_uptime": time.time() - server_stats["start_time"]
        }))
        
        # Process incoming messages
        async for message in websocket:
            try:
                # Update activity timestamp
                client_info["last_activity"] = time.time()
                client_info["messages_received"] += 1
                server_stats["messages_received"] += 1
                
                data = json.loads(message)
                message_type = data.get("type", "unknown")
                message_id = data.get("id", f"auto_{time.time()}")
                
                logger.info(f"Received message from {client_id}: {message_type} (ID: {message_id})")
                
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
                client_info["messages_sent"] += 1
                server_stats["messages_sent"] += 1
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from {client_id}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": "Invalid JSON message",
                    "timestamp": time.time()
                }))
                server_stats["errors"] += 1
                server_stats["last_error"] = "Invalid JSON message"
                client_info["messages_sent"] += 1
                server_stats["messages_sent"] += 1
                
            except Exception as e:
                logger.error(f"Error processing message from {client_id}: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "error": str(e),
                    "timestamp": time.time()
                }))
                server_stats["errors"] += 1
                server_stats["last_error"] = str(e)
                client_info["messages_sent"] += 1
                server_stats["messages_sent"] += 1
                
    except Exception as e:
        client_id_str = client_info.get("id", "unknown client") if "client_info" in locals() else "unknown client"
        logger.error(f"Connection error with {client_id_str}: {e}")
        server_stats["errors"] += 1
        server_stats["last_error"] = str(e)
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
            if websocket in connection_metadata:
                client_id = connection_metadata[websocket]["id"]
                del connection_metadata[websocket]
                logger.info(f"Connection closed: {client_id}")
            else:
                logger.info("Connection closed (unknown client)")

# Heartbeat function
async def heartbeat():
    """Send periodic heartbeats to all connections"""
    while True:
        try:
            if active_connections:
                logger.info(f"Sending heartbeat to {len(active_connections)} clients")
                disconnected = []
                
                for websocket in active_connections:
                    try:
                        # Check if connection is stale (no activity for 2 minutes)
                        client_info = connection_metadata.get(websocket, {})
                        last_activity = client_info.get("last_activity", 0)
                        
                        if time.time() - last_activity > 120:  # 2 minutes
                            logger.info(f"Client {client_info.get('id', 'unknown')} inactive for too long, closing")
                            await websocket.close(1000, "Inactive connection")
                            disconnected.append(websocket)
                            continue
                        
                        # Send heartbeat
                        await websocket.send(json.dumps({
                            "type": "heartbeat",
                            "timestamp": time.time(),
                            "connections": len(active_connections),
                            "server_stats": {
                                "uptime": time.time() - server_stats["start_time"],
                                "total_connections": server_stats["total_connections"],
                                "active_connections": len(active_connections)
                            }
                        }))
                        client_info["messages_sent"] = client_info.get("messages_sent", 0) + 1
                        server_stats["messages_sent"] += 1
                        
                    except websockets.exceptions.ConnectionClosed:
                        disconnected.append(websocket)
                    except Exception as e:
                        logger.error(f"Error sending heartbeat: {e}")
                        disconnected.append(websocket)
                
                # Clean up disconnected clients
                for websocket in disconnected:
                    if websocket in active_connections:
                        active_connections.remove(websocket)
                    if websocket in connection_metadata:
                        client_id = connection_metadata[websocket]["id"]
                        del connection_metadata[websocket]
                        logger.info(f"Removed stale connection: {client_id}")
                
            await asyncio.sleep(30)  # 30 second interval
        except Exception as e:
            logger.error(f"Error in heartbeat: {e}")
            await asyncio.sleep(5)  # Wait a bit before retry if there's an error

# Status reporter
async def status_reporter():
    """Periodically log server status"""
    while True:
        try:
            active_count = len(active_connections)
            uptime = time.time() - server_stats["start_time"]
            
            logger.info(
                f"Server Status: Uptime={uptime:.1f}s, "
                f"Active={active_count}, "
                f"Total={server_stats['total_connections']}, "
                f"Msgs Rcvd={server_stats['messages_received']}, "
                f"Msgs Sent={server_stats['messages_sent']}, "
                f"Errors={server_stats['errors']}"
            )
            
            await asyncio.sleep(120)  # Report every 2 minutes
        except Exception as e:
            logger.error(f"Error in status reporter: {e}")
            await asyncio.sleep(30)

# Graceful shutdown handler
async def shutdown(signal=None):
    """Cleanly shut down the server"""
    if signal:
        logger.info(f"Received exit signal {signal.name}...")
    
    logger.info("Closing all WebSocket connections...")
    close_tasks = []
    for ws in active_connections:
        try:
            close_tasks.append(ws.close(1001, "Server shutting down"))
        except:
            pass
    
    if close_tasks:
        await asyncio.gather(*close_tasks, return_exceptions=True)
    
    logger.info(f"Shutting down {len(active_connections)} connections")
    
    tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
    logger.info(f"Cancelling {len(tasks)} outstanding tasks")
    for task in tasks:
        task.cancel()
    
    await asyncio.gather(*tasks, return_exceptions=True)
    logger.info("All connections closed")

# Main server function
async def start_server():
    """Start the WebSocket server"""
    port = 8001
    logger.info(f"Starting WebSocket server on port {port}")
    
    # Setup signal handlers for graceful shutdown
    for sig in (signal.SIGTERM, signal.SIGINT):
        asyncio.get_event_loop().add_signal_handler(
            sig, lambda s=sig: asyncio.create_task(shutdown(s))
        )
    
    # Create the server with ping_interval and ping_timeout
    async with websockets.serve(
        handler, 
        "0.0.0.0", 
        port,
        ping_interval=20,      # Send ping every 20 seconds 
        ping_timeout=10,       # Wait 10 seconds for pong response
        close_timeout=5        # Wait 5 seconds for close handshake
    ):
        logger.info(f"WebSocket server started and listening on port {port}")
        
        # Start background tasks
        heartbeat_task = asyncio.create_task(heartbeat())
        status_task = asyncio.create_task(status_reporter())
        
        # Keep the server running
        await asyncio.Future()

if __name__ == "__main__":
    print("[websocket] Enhanced WebSocket server initialized")
    
    # Set maximum number of open files limit if possible
    try:
        import resource
        soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
        resource.setrlimit(resource.RLIMIT_NOFILE, (hard, hard))
        logger.info(f"File descriptor limit: {soft} → {hard}")
    except (ImportError, ValueError):
        pass  # Skip if not available
    except Exception as e:
        logger.warning(f"Could not set file descriptor limit: {e}")
        pass
    
    try:
        # Run the server
        asyncio.run(start_server())
    except KeyboardInterrupt:
        logger.info("Server shut down by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error starting WebSocket server: {e}")
        sys.exit(1)