"""
Timeline Visualization Plugin
Provides visualization capabilities for Clara's timeline of activities.
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import json
import plotly.graph_objects as go
from core.common_types import Goal, Mission, Task, GoalStatus, MissionStatus, TaskStatus
from core.plugin.base import BasePlugin

logger = logging.getLogger(__name__)

@dataclass
class TimelineEvent:
    """Represents a single event on the timeline."""
    id: str
    title: str
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    event_type: str  # 'goal', 'mission', or 'task'
    description: str
    color: str = '#1f77b4'  # default blue

class TimelineVisualizer(BasePlugin):
    """Handles visualization of Clara's timeline of activities."""
    
    STATUS_COLORS = {
        'completed': '#2ecc71',  # green
        'failed': '#e74c3c',     # red
        'in_progress': '#3498db', # blue
        'pending': '#95a5a6',    # gray
        'cancelled': '#7f8c8d',  # dark gray
        'blocked': '#e67e22'     # orange
    }

    def __init__(self):
        super().__init__(
            name="TimelineVisualizer",
            version="1.0.0",
            description="Provides visualization capabilities for Clara's timeline",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.events: List[TimelineEvent] = []

    def add_goal(self, goal: Goal) -> None:
        """Add a goal to the timeline."""
        color = self.STATUS_COLORS.get(goal.status.value, '#1f77b4')
        self.events.append(TimelineEvent(
            id=goal.id,
            title=goal.name,
            start_time=goal.created_at,
            end_time=goal.updated_at if goal.status in [GoalStatus.COMPLETED, GoalStatus.FAILED] else None,
            status=goal.status.value,
            event_type='goal',
            description=goal.description,
            color=color
        ))

    def add_mission(self, mission: Mission) -> None:
        """Add a mission to the timeline."""
        color = self.STATUS_COLORS.get(mission.status.value, '#1f77b4')
        self.events.append(TimelineEvent(
            id=mission.id,
            title=mission.name,
            start_time=mission.created_at,
            end_time=mission.completed_at,
            status=mission.status.value,
            event_type='mission',
            description=mission.description,
            color=color
        ))

    def add_task(self, task: Task) -> None:
        """Add a task to the timeline."""
        color = self.STATUS_COLORS.get(task.status.value, '#1f77b4')
        self.events.append(TimelineEvent(
            id=task.id,
            title=task.name,
            start_time=task.created_at,
            end_time=task.completed_at,
            status=task.status.value,
            event_type='task',
            description=task.description,
            color=color
        ))

    def generate_html(self, output_path: str) -> None:
        """Generate an HTML timeline visualization."""
        if not self.events:
            logger.warning("No events to visualize")
            return

        # Sort events by start time
        self.events.sort(key=lambda x: x.start_time)

        # Create figure
        fig = go.Figure()

        # Add events to figure
        for event in self.events:
            end_time = event.end_time or datetime.now()
            fig.add_trace(go.Scatter(
                x=[event.start_time, end_time],
                y=[event.event_type],
                mode='lines',
                name=event.title,
                line=dict(color=event.color, width=10),
                text=f"{event.title}<br>{event.description}<br>Status: {event.status}",
                hoverinfo='text'
            ))

        # Update layout
        fig.update_layout(
            title="Clara Activity Timeline",
            xaxis_title="Time",
            yaxis_title="Event Type",
            showlegend=True,
            height=400,
            template="plotly_white"
        )

        # Save to HTML
        fig.write_html(output_path)
        logger.info(f"Timeline visualization saved to {output_path}")

    def export_json(self, output_path: str) -> None:
        """Export timeline data to JSON format."""
        data = [{
            'id': event.id,
            'title': event.title,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat() if event.end_time else None,
            'status': event.status,
            'event_type': event.event_type,
            'description': event.description,
            'color': event.color
        } for event in self.events]

        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Timeline data exported to {output_path}")

    def clear(self) -> None:
        """Clear all events from .the timeline."""
        self.events = []
        logger.info("Timeline cleared") 