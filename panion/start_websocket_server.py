#!/usr/bin/env python3
"""
Launcher for the Panion WebSocket Server
Starts the WebSocket server on port 8001
"""

import sys
import os
import logging
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Basic Panion WebSocket Server on port 8001")
    print("[websocket] Basic WebSocket server initialized")
    
    # Import and run the basic websocket server directly
    try:
        # Import the module
        import basic_websocket_server
        
        # Execute the module directly (which will run the server)
        exec(open("basic_websocket_server.py").read())
    except KeyboardInterrupt:
        logger.info("Server shut down by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error starting WebSocket server: {e}")
        sys.exit(1)