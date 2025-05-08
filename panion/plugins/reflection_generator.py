"""
Reflection Generator Plugin
Automatically generates system reflections and insights.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import pytz
from collections import defaultdict

from core.plugin.base import BasePlugin
from core.panion_memory import MemoryManager, MemoryCategory, ReflectionType

class ReflectionGeneratorPlugin(BasePlugin):
    """Plugin for generating system reflections and insights."""
    
    def __init__(self):
        super().__init__(
            name="ReflectionGenerator",
            version="1.0.0",
            description="Generates system reflections and insights",
            author="Panion Team"
        )
        
        self.logger = logging.getLogger(__name__)
        self.memory_manager: Optional[MemoryManager] = None
        
        # Configuration
        self.config = {
            "daily_summary_time": "23:00",
            "weekly_review_day": "sunday",
            "insight_threshold": 3,  # Minimum occurrences for pattern
            "insight_confidence": 0.7,  # Minimum confidence for insight
            "max_insights": 100,  # Maximum number of insights to keep
            "timezone": "UTC"  # Default timezone
        }
    
    async def initialize(self) -> bool:
        """Initialize the plugin."""
        try:
            # Get memory manager
            self.memory_manager = self.get_manager("MemoryManager")
            if not self.memory_manager:
                self.logger.error("MemoryManager not found")
                return False
            
            # Set timezone
            self.timezone = pytz.timezone(self.config["timezone"])
            
            # Schedule daily summary
            self.schedule_task(
                self._generate_daily_summary,
                time=self.config["daily_summary_time"],
                timezone=self.timezone
            )
            
            # Schedule weekly review
            self.schedule_task(
                self._generate_weekly_review,
                day=self.config["weekly_review_day"],
                time="00:00",
                timezone=self.timezone
            )
            
            # Schedule insight generation
            self.schedule_task(
                self._generate_insights,
                interval=timedelta(hours=6)
            )
            
            # Schedule insight cleanup
            self.schedule_task(
                self._cleanup_insights,
                interval=timedelta(days=1)
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error initializing plugin: {e}")
            return False
    
    async def _generate_daily_summary(self) -> None:
        """Generate daily summary of system activity."""
        try:
            # Get current time in configured timezone
            now = datetime.now(self.timezone)
            start_time = now - timedelta(days=1)
            
            # Get memories from last 24 hours
            memories = await self.memory_manager.recall({
                "start_time": start_time,
                "end_time": now
            })
            
            if not memories:
                self.logger.info("No memories found for daily summary")
                return
            
            # Analyze memories by category
            category_stats = defaultdict(int)
            for memory in memories:
                category_stats[memory["category"]] += 1
            
            # Extract highlights and challenges
            highlights = await self._extract_highlights(memories)
            challenges = await self._extract_challenges(memories)
            
            # Generate summary
            summary = {
                "date": now.strftime("%Y-%m-%d"),
                "category_stats": dict(category_stats),
                "highlights": highlights,
                "challenges": challenges,
                "total_memories": len(memories)
            }
            
            # Store as reflection
            await self.memory_manager.remember_reflection(
                content=summary,
                reflection_type=ReflectionType.DAILY_SUMMARY
            )
            
            self.logger.info(f"Generated daily summary for {now.strftime('%Y-%m-%d')}")
            
        except Exception as e:
            self.logger.error(f"Error generating daily summary: {e}")
    
    async def _generate_weekly_review(self) -> None:
        """Generate weekly review of system activity."""
        try:
            # Get current time in configured timezone
            now = datetime.now(self.timezone)
            start_time = now - timedelta(days=7)
            
            # Get memories from last week
            memories = await self.memory_manager.recall({
                "start_time": start_time,
                "end_time": now
            })
            
            if not memories:
                self.logger.info("No memories found for weekly review")
                return
            
            # Analyze patterns
            successes = await self._extract_successes(memories)
            failures = await self._extract_failures(memories)
            improvements = await self._suggest_improvements(memories)
            
            # Generate review
            review = {
                "week_start": start_time.strftime("%Y-%m-%d"),
                "week_end": now.strftime("%Y-%m-%d"),
                "successes": successes,
                "failures": failures,
                "improvements": improvements,
                "total_memories": len(memories)
            }
            
            # Store as reflection
            await self.memory_manager.remember_reflection(
                content=review,
                reflection_type=ReflectionType.WEEKLY_REVIEW
            )
            
            self.logger.info(f"Generated weekly review for week of {start_time.strftime('%Y-%m-%d')}")
            
        except Exception as e:
            self.logger.error(f"Error generating weekly review: {e}")
    
    async def _generate_insights(self) -> None:
        """Generate insights from memory patterns."""
        try:
            # Get recent memories
            memories = await self.memory_manager.recall({
                "limit": 1000  # Limit to recent memories
            })
            
            if not memories:
                return
            
            # Analyze patterns
            patterns = await self._analyze_patterns(memories)
            
            # Generate insights for significant patterns
            for pattern, occurrences in patterns.items():
                if len(occurrences) >= self.config["insight_threshold"]:
                    # Calculate confidence based on pattern strength
                    confidence = min(1.0, len(occurrences) / self.config["insight_threshold"])
                    
                    if confidence >= self.config["insight_confidence"]:
                        insight = {
                            "pattern": pattern,
                            "occurrences": len(occurrences),
                            "confidence": confidence,
                            "examples": occurrences[:3]  # Keep top 3 examples
                        }
                        
                        # Store as reflection
                        await self.memory_manager.remember_reflection(
                            content=insight,
                            reflection_type=ReflectionType.INSIGHT
                        )
            
        except Exception as e:
            self.logger.error(f"Error generating insights: {e}")
    
    async def _cleanup_insights(self) -> None:
        """Clean up old insights."""
        try:
            # Get all insights
            insights = await self.memory_manager.recall_reflections(
                reflection_type=ReflectionType.INSIGHT
            )
            
            if len(insights) <= self.config["max_insights"]:
                return
            
            # Sort by confidence and timestamp
            insights.sort(
                key=lambda x: (x["content"]["confidence"], x["timestamp"]),
                reverse=True
            )
            
            # Remove excess insights
            for insight in insights[self.config["max_insights"]:]:
                await self.memory_manager.delete(insight["id"])
            
            self.logger.info(f"Cleaned up {len(insights) - self.config['max_insights']} old insights")
            
        except Exception as e:
            self.logger.error(f"Error cleaning up insights: {e}")
    
    async def _analyze_patterns(self, memories: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Analyze memory patterns."""
        patterns = defaultdict(list)
        
        for memory in memories:
            # Extract key information
            content = memory.get("content", {})
            category = memory.get("category")
            tags = memory.get("tags", [])
            
            # Look for patterns in content
            if isinstance(content, dict):
                for key, value in content.items():
                    if isinstance(value, (str, int, float, bool)):
                        pattern_key = f"{category}:{key}={value}"
                        patterns[pattern_key].append(memory)
            
            # Look for patterns in tags
            for tag in tags:
                pattern_key = f"tag:{tag}"
                patterns[pattern_key].append(memory)
        
        return dict(patterns)
    
    async def _extract_highlights(self, memories: List[Dict[str, Any]]) -> List[str]:
        """Extract highlights from memories."""
        highlights = []
        
        for memory in memories:
            content = memory.get("content", {})
            if isinstance(content, dict):
                # Look for success indicators
                if content.get("success", False):
                    highlights.append(content.get("description", "Successful operation"))
                elif content.get("status") == "success":
                    highlights.append(content.get("message", "Operation succeeded"))
        
        return highlights
    
    async def _extract_challenges(self, memories: List[Dict[str, Any]]) -> List[str]:
        """Extract challenges from memories."""
        challenges = []
        
        for memory in memories:
            content = memory.get("content", {})
            if isinstance(content, dict):
                # Look for error indicators
                if content.get("error"):
                    challenges.append(content.get("error"))
                elif content.get("status") == "error":
                    challenges.append(content.get("message", "Operation failed"))
        
        return challenges
    
    async def _extract_successes(self, memories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract successful operations from memories."""
        successes = []
        
        for memory in memories:
            content = memory.get("content", {})
            if isinstance(content, dict):
                if content.get("success", False) or content.get("status") == "success":
                    successes.append({
                        "description": content.get("description", "Successful operation"),
                        "timestamp": memory.get("timestamp"),
                        "category": memory.get("category")
                    })
        
        return successes
    
    async def _extract_failures(self, memories: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract failed operations from memories."""
        failures = []
        
        for memory in memories:
            content = memory.get("content", {})
            if isinstance(content, dict):
                if content.get("error") or content.get("status") == "error":
                    failures.append({
                        "description": content.get("error", "Operation failed"),
                        "timestamp": memory.get("timestamp"),
                        "category": memory.get("category")
                    })
        
        return failures
    
    async def _suggest_improvements(self, memories: List[Dict[str, Any]]) -> List[str]:
        """Suggest improvements based on memory patterns."""
        improvements = []
        
        # Analyze error patterns
        error_patterns = defaultdict(int)
        for memory in memories:
            content = memory.get("content", {})
            if isinstance(content, dict) and content.get("error"):
                error_patterns[content["error"]] += 1
        
        # Suggest improvements for frequent errors
        for error, count in error_patterns.items():
            if count >= 3:  # Error occurred at least 3 times
                improvements.append(f"Address recurring error: {error}")
        
        return improvements

# Create plugin instance
reflection_generator = ReflectionGeneratorPlugin() 