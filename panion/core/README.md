# Core System Components

The core directory contains the fundamental components of the Panion system, providing the essential infrastructure for plugins, memory management, and goal tracking.

## Directory Structure

```
core/
├── plugin/           # Plugin system components
├── memory/          # Memory management system
├── goals/           # Goal tracking system
├── interfaces.py    # Core system interfaces
└── types.py         # Shared type definitions
```

## Components

### Plugin System (`plugin/`)
- **Base Plugin Class**: Foundation for all plugins
- **Plugin Manager**: Handles plugin lifecycle and state
- **Plugin Loader**: Manages plugin discovery and loading
- **Plugin Validator**: Ensures plugin security and compatibility

### Memory System (`memory/`)
- **Memory Manager**: Core memory operations
- **Memory Service**: Data access and persistence
- **Semantic Memory**: Knowledge representation

### Goal System (`goals/`)
- **Goal Manager**: Task and objective management
- **Goal Tracker**: Progress monitoring
- **Goal Types**: Goal-related type definitions

### Core Files
- **interfaces.py**: Defines system-wide interfaces
- **types.py**: Shared type definitions

## Usage

The core components are designed to be used together to provide a robust foundation for the Panion system:

```python
from core.plugin.base import Plugin
from core.memory.manager import MemoryManager
from core.goals.manager import GoalManager

# Initialize core components
memory_manager = MemoryManager()
goal_manager = GoalManager()

# Create a plugin
class MyPlugin(Plugin):
    def __init__(self):
        super().__init__(memory_manager, goal_manager)
```

## Dependencies

- Python 3.8+
- Core system interfaces
- Shared type definitions

## Development

When working with core components:
1. Follow the interface contracts
2. Maintain type safety
3. Handle errors appropriately
4. Document all public APIs 