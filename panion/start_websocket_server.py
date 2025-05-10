#!/usr/bin/env python3
"""
Launcher for the Panion WebSocket Server
Starts the WebSocket server on port 8001
"""

import sys
import os
import time
import logging
from websocket_server import start_server

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Starting Panion WebSocket Server on port 8001")
    print("Panion WebSocket Server starting on port 8001...")
    
    try:
        start_server()
    except KeyboardInterrupt:
        logger.info("Server shut down by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error starting WebSocket server: {e}")
        sys.exit(1)