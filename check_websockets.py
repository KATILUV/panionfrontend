#!/usr/bin/env python3
"""
Check WebSockets Library Version
A simple script to detect the installed version of the websockets library
"""

import sys
import importlib.metadata

try:
    # Try to get version using importlib.metadata (Python 3.8+)
    version = importlib.metadata.version('websockets')
    print(f"WebSockets library version: {version}")
except:
    try:
        # Fallback method - try to import and check 
        import websockets
        print(f"WebSockets library imported successfully")
        print(f"WebSockets library path: {websockets.__file__}")
        
        # Try to access version attribute if available
        if hasattr(websockets, "version"):
            print(f"WebSockets version attribute: {websockets.version}")
        else:
            print("WebSockets version attribute not found")
            
        # Check for specific modules that might indicate version
        print("\nChecking available websockets modules:")
        print(f"Has 'server' module: {hasattr(websockets, 'server')}")
        print(f"Has 'serve' attribute: {hasattr(websockets, 'serve')}")
        print(f"Has 'legacy' module: {hasattr(websockets, 'legacy')}")
        print(f"Has 'exceptions' module: {hasattr(websockets, 'exceptions')}")
        
    except ImportError:
        print("WebSockets library not installed")
        sys.exit(1)
    except Exception as e:
        print(f"Error checking WebSockets: {e}")
        sys.exit(1)

print("\nSystem information:")
print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")

print("\nAvailable WebSockets entry points:")
try:
    # List all entry points for websockets
    for entry_point in importlib.metadata.entry_points():
        if hasattr(entry_point, 'group') and 'websockets' in entry_point.group:
            print(f"- {entry_point}")
except:
    print("Could not get entry points information")

if __name__ == "__main__":
    print("WebSockets compatibility check completed")