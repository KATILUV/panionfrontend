"""
Simple WebSocket server for Panion
Compatible with all websockets library versions
"""

import asyncio
import json
import logging
import time
import websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Active connections
active_connections = set()

async def connection_handler(websocket, path='/'):
    """Connection handler that supports both new and old websockets library versions"""
    active_connections.add(websocket)
    logger.info(f"New connection established on path: {path}")
    
    try:
        # Send a welcome message
        await websocket.send(json.dumps({
            'type': 'connection_established',
            'timestamp': time.time(),
            'message': 'Welcome to Panion WebSocket Server'
        }))
        
        # Process messages
        async for message in websocket:
            try:
                data = json.loads(message)
                message_id = data.get('id', f'msg_{time.time()}')
                message_type = data.get('type', 'unknown')
                
                logger.info(f"Received {message_type} message with ID {message_id}")
                
                # Simple echo response
                response = {
                    'id': message_id,
                    'type': f'{message_type}_response',
                    'timestamp': time.time(),
                    'data': {
                        'status': 'success',
                        'message': f'Processed {message_type} message'
                    }
                }
                
                await websocket.send(json.dumps(response))
                
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'timestamp': time.time(),
                    'error': 'Invalid JSON message'
                }))
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send(json.dumps({
                    'type': 'error',
                    'timestamp': time.time(),
                    'error': str(e)
                }))
    
    except websockets.exceptions.ConnectionClosed:
        logger.info("Connection closed")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        logger.info("Connection handler completed")

async def heartbeat():
    """Send periodic heartbeats to all connected clients"""
    while True:
        try:
            if active_connections:
                logger.info(f"Sending heartbeat to {len(active_connections)} connections")
                
                # Make a copy to avoid "Set changed size during iteration" errors
                connections = set(active_connections)
                
                for websocket in connections:
                    try:
                        await websocket.send(json.dumps({
                            'type': 'heartbeat',
                            'timestamp': time.time(),
                            'data': {
                                'active_connections': len(active_connections)
                            }
                        }))
                    except websockets.exceptions.ConnectionClosed:
                        # Will be cleaned up on next iteration
                        pass
                    except Exception as e:
                        logger.error(f"Error sending heartbeat: {e}")
            
            await asyncio.sleep(30)  # Wait 30 seconds between heartbeats
        except Exception as e:
            logger.error(f"Error in heartbeat task: {e}")
            await asyncio.sleep(5)  # Wait 5 seconds on error before retrying

def start_server():
    """Start the websocket server"""
    # This pattern works with all websockets versions
    server = websockets.serve(connection_handler, '0.0.0.0', 8001)
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Start the server
    server_task = loop.run_until_complete(server)
    logger.info("WebSocket server started on port 8001")
    
    # Start the heartbeat task
    heartbeat_task = loop.create_task(heartbeat())
    
    try:
        # Run forever
        loop.run_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
    finally:
        # Cancel pending tasks
        heartbeat_task.cancel()
        
        # Close the server
        server_task.close()
        loop.run_until_complete(server_task.wait_closed())
        
        # Close the event loop
        loop.close()
        logger.info("Server shutdown complete")

if __name__ == "__main__":
    logger.info("Starting simple websocket server")
    print("Starting WebSocket server on port 8001")
    start_server()