"""
Core models package.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
from datetime import datetime

@dataclass
class StateChange:
    """Represents a change in system state."""
    component_id: str
    change_type: str
    old_value: Any
    new_value: Any
    timestamp: datetime = datetime.now()
    metadata: Optional[Dict[str, Any]] = None 