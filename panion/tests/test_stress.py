import pytest
import asyncio
import psutil
import time
from datetime import datetime, timedelta
from pathlib import Path
import json
import random

from core.panion_orchestrator import orchestrator
from core.panion_memory import memory_system
from core.goals.manager import goal_manager, TestGoal
from core.plugin.manager import plugin_manager
from core.metrics import metrics
from core.interfaces import ComponentState

# ... existing code ... 