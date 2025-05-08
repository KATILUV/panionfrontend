import pytest
import asyncio
from datetime import datetime, timedelta

from core.panion_system import PanionSystem
from core.goals.manager import goal_manager
from core.goals.types import GoalStatus, GoalPriority
from core.panion_orchestrator import PanionOrchestrator
from core.shared_state import shared_state, ComponentState
from core.panion_memory import memory_manager, MemoryCategory
from core.plugin.manager import plugin_manager

# ... existing code ... 