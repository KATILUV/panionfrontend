"""
Clara Emotional Support Agent
Provides emotional support, helps users dream bigger, and provides clarity on personal goals.
"""

import os
import json
import logging
import uuid
import re
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class EmotionType(Enum):
    """Types of emotions that Clara can detect and respond to."""
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    LOVE = "love"
    ANXIETY = "anxiety"
    CONFUSION = "confusion"
    ENTHUSIASM = "enthusiasm"
    DISAPPOINTMENT = "disappointment"
    GRATITUDE = "gratitude"
    HOPE = "hope"
    OVERWHELM = "overwhelm"
    NEUTRAL = "neutral"

class GoalClarity(Enum):
    """Levels of clarity in a user's goal or vision."""
    VAGUE = "vague"
    FORMING = "forming"
    SPECIFIC = "specific"
    DETAILED = "detailed"
    ACTIONABLE = "actionable"

class MemoryCategory(Enum):
    """Categories for Clara's memory storage."""
    PERSONAL = "personal"
    PREFERENCES = "preferences"
    GOALS = "goals"
    ACHIEVEMENTS = "achievements"
    CHALLENGES = "challenges"
    EMOTIONS = "emotions"
    CONVERSATIONS = "conversations"
    INSIGHTS = "insights"

class Memory:
    """Represents a memory in Clara's memory system."""
    
    def __init__(self, 
                memory_id: str,
                content: str,
                category: MemoryCategory,
                date: datetime = None,
                importance: float = 0.5,
                related_to: List[str] = None,
                metadata: Dict[str, Any] = None):
        """
        Initialize a memory.
        
        Args:
            memory_id: Unique identifier for the memory
            content: Content of the memory
            category: Category of the memory
            date: When the memory was formed
            importance: Importance score (0.0-1.0)
            related_to: List of related memory IDs
            metadata: Additional metadata
        """
        self.memory_id = memory_id
        self.content = content
        self.category = category
        self.date = date or datetime.now()
        self.importance = importance
        self.related_to = related_to or []
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.access_count = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "memory_id": self.memory_id,
            "content": self.content,
            "category": self.category.value,
            "date": self.date.isoformat(),
            "importance": self.importance,
            "related_to": self.related_to,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "access_count": self.access_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Memory':
        """Create a Memory instance from a dictionary."""
        memory = cls(
            memory_id=data["memory_id"],
            content=data["content"],
            category=MemoryCategory(data["category"]),
            date=datetime.fromisoformat(data["date"]),
            importance=data.get("importance", 0.5),
            related_to=data.get("related_to", []),
            metadata=data.get("metadata", {})
        )
        
        memory.created_at = datetime.fromisoformat(data["created_at"])
        memory.last_accessed = datetime.fromisoformat(data["last_accessed"])
        memory.access_count = data.get("access_count", 0)
        
        return memory
    
    def access(self):
        """Record that this memory was accessed."""
        self.last_accessed = datetime.now()
        self.access_count += 1

class EmotionalPattern:
    """Represents a pattern of emotional responses over time."""
    
    def __init__(self, 
                pattern_id: str,
                primary_emotion: EmotionType,
                secondary_emotions: List[EmotionType] = None,
                triggers: List[str] = None,
                frequency: float = 0.0,
                first_observed: datetime = None):
        """
        Initialize an emotional pattern.
        
        Args:
            pattern_id: Unique identifier for the pattern
            primary_emotion: The main emotion in this pattern
            secondary_emotions: Additional emotions that co-occur
            triggers: Potential triggers for this pattern
            frequency: How frequently this pattern occurs (0.0-1.0)
            first_observed: When this pattern was first observed
        """
        self.pattern_id = pattern_id
        self.primary_emotion = primary_emotion
        self.secondary_emotions = secondary_emotions or []
        self.triggers = triggers or []
        self.frequency = frequency
        self.first_observed = first_observed or datetime.now()
        self.last_observed = datetime.now()
        self.observation_count = 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "pattern_id": self.pattern_id,
            "primary_emotion": self.primary_emotion.value,
            "secondary_emotions": [e.value for e in self.secondary_emotions],
            "triggers": self.triggers,
            "frequency": self.frequency,
            "first_observed": self.first_observed.isoformat(),
            "last_observed": self.last_observed.isoformat(),
            "observation_count": self.observation_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmotionalPattern':
        """Create an EmotionalPattern instance from a dictionary."""
        pattern = cls(
            pattern_id=data["pattern_id"],
            primary_emotion=EmotionType(data["primary_emotion"]),
            secondary_emotions=[EmotionType(e) for e in data.get("secondary_emotions", [])],
            triggers=data.get("triggers", []),
            frequency=data.get("frequency", 0.0),
            first_observed=datetime.fromisoformat(data["first_observed"])
        )
        
        pattern.last_observed = datetime.fromisoformat(data["last_observed"])
        pattern.observation_count = data.get("observation_count", 1)
        
        return pattern
    
    def update(self, emotions: List[EmotionType], triggers: List[str] = None):
        """Update the pattern with a new observation."""
        # Update secondary emotions
        for emotion in emotions:
            if emotion != self.primary_emotion and emotion not in self.secondary_emotions:
                self.secondary_emotions.append(emotion)
        
        # Update triggers
        if triggers:
            for trigger in triggers:
                if trigger not in self.triggers:
                    self.triggers.append(trigger)
        
        # Update timestamps and count
        self.last_observed = datetime.now()
        self.observation_count += 1

class PersonalGoal:
    """Represents a personal goal that Clara is helping with."""
    
    def __init__(self, 
                goal_id: str,
                title: str,
                description: str,
                clarity: GoalClarity = GoalClarity.FORMING,
                importance: float = 0.5,
                category: str = "personal",
                target_date: Optional[datetime] = None,
                steps: List[Dict[str, Any]] = None,
                challenges: List[str] = None):
        """
        Initialize a personal goal.
        
        Args:
            goal_id: Unique identifier for the goal
            title: Short title of the goal
            description: Detailed description
            clarity: How clear/specific the goal is
            importance: Importance to the user (0.0-1.0)
            category: Category of the goal
            target_date: Target completion date
            steps: List of steps to achieve the goal
            challenges: List of anticipated challenges
        """
        self.goal_id = goal_id
        self.title = title
        self.description = description
        self.clarity = clarity
        self.importance = importance
        self.category = category
        self.target_date = target_date
        self.steps = steps or []
        self.challenges = challenges or []
        
        # Runtime attributes
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.progress = 0.0  # 0.0-1.0
        self.active = True
        self.completed = False
        self.completed_at = None
        self.reflections = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "goal_id": self.goal_id,
            "title": self.title,
            "description": self.description,
            "clarity": self.clarity.value,
            "importance": self.importance,
            "category": self.category,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "steps": self.steps,
            "challenges": self.challenges,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "progress": self.progress,
            "active": self.active,
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "reflections": self.reflections
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PersonalGoal':
        """Create a PersonalGoal instance from a dictionary."""
        goal = cls(
            goal_id=data["goal_id"],
            title=data["title"],
            description=data["description"],
            clarity=GoalClarity(data["clarity"]),
            importance=data.get("importance", 0.5),
            category=data.get("category", "personal"),
            target_date=datetime.fromisoformat(data["target_date"]) if data.get("target_date") else None,
            steps=data.get("steps", []),
            challenges=data.get("challenges", [])
        )
        
        goal.created_at = datetime.fromisoformat(data["created_at"])
        goal.updated_at = datetime.fromisoformat(data["updated_at"])
        goal.progress = data.get("progress", 0.0)
        goal.active = data.get("active", True)
        goal.completed = data.get("completed", False)
        goal.completed_at = datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None
        goal.reflections = data.get("reflections", [])
        
        return goal
    
    def add_reflection(self, reflection: str, author: str = "user"):
        """Add a reflection on the goal's progress."""
        self.reflections.append({
            "content": reflection,
            "author": author,
            "timestamp": datetime.now().isoformat()
        })
        self.updated_at = datetime.now()
    
    def update_progress(self, progress: float):
        """Update the progress towards this goal."""
        self.progress = max(0.0, min(1.0, progress))
        self.updated_at = datetime.now()
        
        if self.progress >= 1.0 and not self.completed:
            self.completed = True
            self.completed_at = datetime.now()
    
    def add_step(self, title: str, description: str = "", estimated_effort: float = 1.0):
        """Add a step towards achieving this goal."""
        step = {
            "step_id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "estimated_effort": estimated_effort,
            "completed": False,
            "created_at": datetime.now().isoformat()
        }
        self.steps.append(step)
        self.updated_at = datetime.now()
        return step["step_id"]
    
    def complete_step(self, step_id: str) -> bool:
        """Mark a step as completed."""
        for step in self.steps:
            if step.get("step_id") == step_id:
                step["completed"] = True
                step["completed_at"] = datetime.now().isoformat()
                self.updated_at = datetime.now()
                
                # Recalculate progress
                completed_steps = sum(1 for s in self.steps if s.get("completed", False))
                self.progress = completed_steps / len(self.steps) if self.steps else 0.0
                
                if self.progress >= 1.0 and not self.completed:
                    self.completed = True
                    self.completed_at = datetime.now()
                
                return True
        return False

class ClaraEmotionalSupportAgent:
    """
    Clara - an emotional support agent that helps users
    find clarity, dream bigger, and process emotions.
    """
    
    def __init__(self):
        """Initialize the Clara emotional support agent."""
        self.name = "Clara"
        self.description = "Emotional support and personal growth assistant"
        
        # Data storage paths
        self.data_dir = "./clara_memory"
        self.memories_file = os.path.join(self.data_dir, "memories.json")
        self.patterns_file = os.path.join(self.data_dir, "patterns.json")
        self.goals_file = os.path.join(self.data_dir, "goals.json")
        self.sessions_dir = os.path.join(self.data_dir, "sessions")
        
        # Create directories if they don't exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.sessions_dir, exist_ok=True)
        
        # Memory storage
        self.memories = {}  # memory_id -> Memory
        self.emotional_patterns = {}  # pattern_id -> EmotionalPattern
        self.goals = {}  # goal_id -> PersonalGoal
        self.active_sessions = {}  # session_id -> session data
        
        # Load data
        self.load_data()
        
        # Linguistic patterns for emotional detection
        self.emotion_patterns = {
            EmotionType.JOY: [
                r"happy", r"excited", r"thrilled", r"delighted", r"glad",
                r"joy(ful|ous)?", r"ecstatic", r"pleased", r"satisfied", r"content"
            ],
            EmotionType.SADNESS: [
                r"sad", r"unhappy", r"depressed", r"down", r"blue", r"gloomy",
                r"heartbroken", r"miserable", r"disappointed", r"upset"
            ],
            EmotionType.ANGER: [
                r"angry", r"mad", r"furious", r"irritated", r"annoyed",
                r"rage", r"outraged", r"hostile", r"frustrated", r"resentful"
            ],
            EmotionType.FEAR: [
                r"afraid", r"scared", r"fearful", r"terrified", r"anxious",
                r"worried", r"nervous", r"panicked", r"uneasy", r"dread"
            ],
            EmotionType.SURPRISE: [
                r"surprised", r"shocked", r"astonished", r"amazed", r"stunned",
                r"startled", r"unexpected", r"incredible", r"wow", r"unbelievable"
            ],
            EmotionType.LOVE: [
                r"love", r"adore", r"cherish", r"affection", r"fond",
                r"devoted", r"attached", r"passionate", r"warm", r"caring"
            ],
            EmotionType.ANXIETY: [
                r"anxious", r"worried", r"stressed", r"nervous", r"tense",
                r"on edge", r"unsettled", r"restless", r"uneasy", r"concerned"
            ],
            EmotionType.CONFUSION: [
                r"confused", r"puzzled", r"perplexed", r"bewildered", r"disoriented",
                r"unsure", r"uncertain", r"unclear", r"ambiguous", r"mixed up"
            ],
            EmotionType.ENTHUSIASM: [
                r"enthusiastic", r"eager", r"motivated", r"inspired", r"energetic",
                r"passionate", r"driven", r"excited", r"pumped", r"psyched"
            ],
            EmotionType.DISAPPOINTMENT: [
                r"disappointed", r"letdown", r"discouraged", r"disheartened", r"dismayed",
                r"regretful", r"unsatisfied", r"fail(ed|ure)", r"missed", r"unfulfilled"
            ],
            EmotionType.GRATITUDE: [
                r"grateful", r"thankful", r"appreciative", r"indebted", r"blessed",
                r"thank you", r"thanks", r"appreciation", r"gratitude", r"recognize"
            ],
            EmotionType.HOPE: [
                r"hopeful", r"optimistic", r"looking forward", r"promising", r"anticipate",
                r"believe", r"expect", r"wish", r"dream", r"faith"
            ],
            EmotionType.OVERWHELM: [
                r"overwhelmed", r"swamped", r"burdened", r"overloaded", r"too much",
                r"can't handle", r"drowning", r"stressed out", r"at capacity", r"inundated"
            ]
        }
        
        # Goal-related patterns
        self.goal_patterns = {
            "aspirational": [
                r"dream", r"aspire", r"someday", r"wish", r"hope",
                r"would love to", r"always wanted", r"imagine", r"fantasy"
            ],
            "commitment": [
                r"committed", r"determined", r"decided", r"resolved", r"promise",
                r"pledge", r"vow", r"dedicated", r"serious about", r"intent on"
            ],
            "action": [
                r"start", r"begin", r"launch", r"initiate", r"undertake",
                r"implement", r"execute", r"pursue", r"work on", r"tackle"
            ],
            "obstacles": [
                r"obstacle", r"barrier", r"challenge", r"difficulty", r"problem",
                r"hurdle", r"roadblock", r"limitation", r"constraint", r"hindrance"
            ],
            "resources": [
                r"need", r"require", r"resource", r"tool", r"support",
                r"help", r"assistance", r"aid", r"backup", r"funding"
            ]
        }
    
    def load_data(self):
        """Load data from storage."""
        # Load memories
        if os.path.exists(self.memories_file):
            try:
                with open(self.memories_file, 'r') as f:
                    memories_data = json.load(f)
                
                for memory_data in memories_data:
                    memory = Memory.from_dict(memory_data)
                    self.memories[memory.memory_id] = memory
                
                logger.info(f"Loaded {len(self.memories)} memories")
            except Exception as e:
                logger.error(f"Error loading memories: {str(e)}")
        
        # Load emotional patterns
        if os.path.exists(self.patterns_file):
            try:
                with open(self.patterns_file, 'r') as f:
                    patterns_data = json.load(f)
                
                for pattern_data in patterns_data:
                    pattern = EmotionalPattern.from_dict(pattern_data)
                    self.emotional_patterns[pattern.pattern_id] = pattern
                
                logger.info(f"Loaded {len(self.emotional_patterns)} emotional patterns")
            except Exception as e:
                logger.error(f"Error loading emotional patterns: {str(e)}")
        
        # Load goals
        if os.path.exists(self.goals_file):
            try:
                with open(self.goals_file, 'r') as f:
                    goals_data = json.load(f)
                
                for goal_data in goals_data:
                    goal = PersonalGoal.from_dict(goal_data)
                    self.goals[goal.goal_id] = goal
                
                logger.info(f"Loaded {len(self.goals)} goals")
            except Exception as e:
                logger.error(f"Error loading goals: {str(e)}")
    
    def save_data(self):
        """Save data to storage."""
        # Save memories
        try:
            memories_data = [memory.to_dict() for memory in self.memories.values()]
            with open(self.memories_file, 'w') as f:
                json.dump(memories_data, f, indent=2)
            
            logger.info(f"Saved {len(self.memories)} memories")
        except Exception as e:
            logger.error(f"Error saving memories: {str(e)}")
        
        # Save emotional patterns
        try:
            patterns_data = [pattern.to_dict() for pattern in self.emotional_patterns.values()]
            with open(self.patterns_file, 'w') as f:
                json.dump(patterns_data, f, indent=2)
            
            logger.info(f"Saved {len(self.emotional_patterns)} emotional patterns")
        except Exception as e:
            logger.error(f"Error saving emotional patterns: {str(e)}")
        
        # Save goals
        try:
            goals_data = [goal.to_dict() for goal in self.goals.values()]
            with open(self.goals_file, 'w') as f:
                json.dump(goals_data, f, indent=2)
            
            logger.info(f"Saved {len(self.goals)} goals")
        except Exception as e:
            logger.error(f"Error saving goals: {str(e)}")
    
    def create_memory(self, content: str, category: Union[MemoryCategory, str], 
                     importance: float = 0.5, **kwargs) -> Memory:
        """
        Create a new memory.
        
        Args:
            content: Content of the memory
            category: Category of the memory
            importance: Importance score (0.0-1.0)
            **kwargs: Additional memory attributes
            
        Returns:
            The created Memory instance
        """
        # Convert string category to enum if needed
        if isinstance(category, str):
            category = MemoryCategory(category)
        
        memory_id = str(uuid.uuid4())
        memory = Memory(
            memory_id=memory_id,
            content=content,
            category=category,
            importance=importance,
            **kwargs
        )
        
        self.memories[memory_id] = memory
        self.save_data()
        
        logger.info(f"Created memory (ID: {memory_id}, Category: {category.value})")
        return memory
    
    def recall_memories(self, query: str = None, category: Union[MemoryCategory, str] = None, 
                       limit: int = 10) -> List[Memory]:
        """
        Recall memories based on a query and/or category.
        
        Args:
            query: Search query
            category: Memory category to filter by
            limit: Maximum number of memories to return
            
        Returns:
            List of matching Memory instances
        """
        # Convert string category to enum if needed
        if isinstance(category, str) and category:
            category = MemoryCategory(category)
        
        # Filter by category if specified
        memories = list(self.memories.values())
        if category:
            memories = [m for m in memories if m.category == category]
        
        # Filter by query if specified
        if query:
            # In a real implementation, this would use semantic similarity
            # For now, use simple text matching
            query_terms = query.lower().split()
            scored_memories = []
            
            for memory in memories:
                content = memory.content.lower()
                score = sum(1 for term in query_terms if term in content)
                if score > 0:
                    scored_memories.append((memory, score))
            
            # Sort by score (descending)
            memories = [m for m, s in sorted(scored_memories, key=lambda x: x[1], reverse=True)]
        else:
            # Sort by importance and recency
            memories.sort(key=lambda m: (m.importance, m.date), reverse=True)
        
        # Apply limit
        recalled_memories = memories[:limit]
        
        # Update access timestamps
        for memory in recalled_memories:
            memory.access()
        
        return recalled_memories
    
    def detect_emotions(self, text: str) -> List[Tuple[EmotionType, float]]:
        """
        Detect emotions in text.
        
        Args:
            text: Text to analyze
            
        Returns:
            List of (emotion, confidence) tuples
        """
        text = text.lower()
        detected_emotions = []
        
        for emotion, patterns in self.emotion_patterns.items():
            total_matches = 0
            for pattern in patterns:
                matches = re.findall(pattern, text)
                total_matches += len(matches)
            
            if total_matches > 0:
                # Calculate confidence based on number of matches
                confidence = min(0.95, 0.5 + (0.05 * total_matches))
                detected_emotions.append((emotion, confidence))
        
        if not detected_emotions:
            # If no emotions detected, default to neutral
            detected_emotions.append((EmotionType.NEUTRAL, 0.7))
        
        # Sort by confidence (descending)
        detected_emotions.sort(key=lambda x: x[1], reverse=True)
        
        return detected_emotions
    
    def analyze_emotional_pattern(self, emotions: List[Tuple[EmotionType, float]], 
                                 text: str = None) -> Optional[EmotionalPattern]:
        """
        Analyze emotions to identify patterns.
        
        Args:
            emotions: List of (emotion, confidence) tuples
            text: Original text for trigger analysis
            
        Returns:
            An EmotionalPattern if found, None otherwise
        """
        if not emotions:
            return None
        
        # Get primary emotion (highest confidence)
        primary_emotion, _ = emotions[0]
        
        # Get secondary emotions
        secondary_emotions = [e for e, _ in emotions[1:]]
        
        # Extract potential triggers from text
        triggers = []
        if text:
            # This is a simplified trigger extraction
            # In a real implementation, this would use more sophisticated NLP
            for tr_pattern in [r"because\s+(.+?)[.!?]", r"when\s+(.+?)[.!?]", r"after\s+(.+?)[.!?]"]:
                matches = re.findall(tr_pattern, text, re.IGNORECASE)
                triggers.extend(matches)
        
        # Check if this matches an existing pattern
        for pattern in self.emotional_patterns.values():
            if pattern.primary_emotion == primary_emotion:
                # Update the existing pattern
                pattern.update(secondary_emotions, triggers)
                self.save_data()
                return pattern
        
        # Create a new pattern
        pattern_id = str(uuid.uuid4())
        pattern = EmotionalPattern(
            pattern_id=pattern_id,
            primary_emotion=primary_emotion,
            secondary_emotions=secondary_emotions,
            triggers=triggers
        )
        
        self.emotional_patterns[pattern_id] = pattern
        self.save_data()
        
        logger.info(f"Created new emotional pattern: {primary_emotion.value}")
        return pattern
    
    def create_personal_goal(self, title: str, description: str, **kwargs) -> PersonalGoal:
        """
        Create a new personal goal.
        
        Args:
            title: Goal title
            description: Detailed description
            **kwargs: Additional goal attributes
            
        Returns:
            The created PersonalGoal instance
        """
        goal_id = str(uuid.uuid4())
        goal = PersonalGoal(
            goal_id=goal_id,
            title=title,
            description=description,
            **kwargs
        )
        
        self.goals[goal_id] = goal
        self.save_data()
        
        logger.info(f"Created personal goal: {title} (ID: {goal_id})")
        return goal
    
    def enhance_goal_clarity(self, goal_id: str, clarified_description: str = None, 
                            new_steps: List[Dict[str, str]] = None) -> Optional[PersonalGoal]:
        """
        Enhance the clarity of a personal goal.
        
        Args:
            goal_id: ID of the goal to enhance
            clarified_description: Updated description
            new_steps: List of new steps to add
            
        Returns:
            The updated PersonalGoal instance, or None if not found
        """
        goal = self.goals.get(goal_id)
        if not goal:
            return None
        
        # Update description if provided
        if clarified_description:
            goal.description = clarified_description
        
        # Add new steps if provided
        if new_steps:
            for step in new_steps:
                goal.add_step(
                    title=step["title"],
                    description=step.get("description", ""),
                    estimated_effort=step.get("estimated_effort", 1.0)
                )
        
        # Improve clarity level if conditions met
        if ((clarified_description or len(goal.description) > 100) and 
            len(goal.steps) >= 3 and 
            goal.clarity == GoalClarity.VAGUE):
            goal.clarity = GoalClarity.FORMING
            
        elif (len(goal.steps) >= 5 and 
              all(len(step.get("description", "")) > 20 for step in goal.steps) and
              goal.clarity == GoalClarity.FORMING):
            goal.clarity = GoalClarity.SPECIFIC
            
        elif (len(goal.steps) >= 7 and 
              all(len(step.get("description", "")) > 50 for step in goal.steps) and
              goal.clarity == GoalClarity.SPECIFIC and
              goal.target_date):
            goal.clarity = GoalClarity.DETAILED
            
        elif (goal.clarity == GoalClarity.DETAILED and
              all("resources" in step or "success_criteria" in step for step in goal.steps)):
            goal.clarity = GoalClarity.ACTIONABLE
        
        goal.updated_at = datetime.now()
        self.save_data()
        
        logger.info(f"Enhanced goal clarity for: {goal.title} (new clarity: {goal.clarity.value})")
        return goal
    
    def dream_expansion(self, goal_id: str, expanded_vision: str, 
                       new_possibilities: List[str]) -> Optional[Dict[str, Any]]:
        """
        Expand a dream or goal with new possibilities.
        
        Args:
            goal_id: ID of the goal to expand
            expanded_vision: Expanded vision for the goal
            new_possibilities: List of new possibilities to consider
            
        Returns:
            Dictionary with expansion results, or None if goal not found
        """
        goal = self.goals.get(goal_id)
        if not goal:
            return None
        
        # Create a dream expansion record
        expansion = {
            "expansion_id": str(uuid.uuid4()),
            "goal_id": goal_id,
            "original_description": goal.description,
            "expanded_vision": expanded_vision,
            "new_possibilities": new_possibilities,
            "timestamp": datetime.now().isoformat()
        }
        
        # Update the goal with expanded vision
        goal.description = expanded_vision
        goal.updated_at = datetime.now()
        
        # Add the expansion as a reflection
        goal.add_reflection(
            f"Dream expansion: {expanded_vision}\n\nNew possibilities:\n" + 
            "\n".join(f"- {p}" for p in new_possibilities),
            author="clara"
        )
        
        self.save_data()
        
        logger.info(f"Expanded dream for goal: {goal.title}")
        return expansion
    
    def emotional_reflection(self, text: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Process and reflect on the emotional content of a message.
        
        Args:
            text: Message text to analyze
            session_id: Session identifier
            
        Returns:
            Dictionary with emotional reflection results
        """
        # Detect emotions
        emotions = self.detect_emotions(text)
        
        # Analyze emotional pattern
        pattern = self.analyze_emotional_pattern(emotions, text)
        
        # Create a memory of this emotional moment
        if emotions and emotions[0][0] != EmotionType.NEUTRAL:
            self.create_memory(
                content=f"Expressed {emotions[0][0].value}: '{text}'",
                category=MemoryCategory.EMOTIONS,
                importance=emotions[0][1],
                metadata={"session_id": session_id, "emotions": [(e.value, c) for e, c in emotions]}
            )
        
        # Generate reflection
        primary_emotion = emotions[0][0] if emotions else EmotionType.NEUTRAL
        
        reflections = {
            EmotionType.JOY: [
                "It's wonderful to hear that you're feeling joyful!",
                "I'm happy to see your positive energy.",
                "Your joy radiates through your words.",
                "Celebrating your happiness with you!",
                "What a beautiful moment of joy to acknowledge."
            ],
            EmotionType.SADNESS: [
                "I notice some sadness in your words. Would you like to explore that feeling?",
                "It sounds like you're going through a difficult time. I'm here to listen.",
                "I hear the sadness in what you're sharing. It's okay to feel this way.",
                "Sometimes sadness helps us process important emotions. I'm here with you.",
                "Thank you for sharing these feelings of sadness. It takes courage."
            ],
            EmotionType.ANGER: [
                "I can hear how frustrated you are with this situation.",
                "Your anger seems to come from something that matters deeply to you.",
                "It's natural to feel angry when boundaries or values are crossed.",
                "I'm listening and recognizing your anger without judgment.",
                "Sometimes anger gives us important information about our needs."
            ],
            EmotionType.FEAR: [
                "I notice some fear or anxiety in your words. Would you like to explore that?",
                "It's brave of you to acknowledge these feelings of fear.",
                "Fear often comes when something matters deeply to us.",
                "I hear your concerns and uncertainty.",
                "Let's gently explore what feels uncertain or overwhelming."
            ],
            EmotionType.SURPRISE: [
                "This seems to have really surprised you!",
                "Unexpected events can certainly catch us off guard.",
                "I'm hearing how surprising this was for you.",
                "It's natural to need time to process surprising news or events.",
                "Sometimes surprises lead us to reconsider our expectations."
            ],
            EmotionType.LOVE: [
                "The love in your words is beautiful to witness.",
                "I can feel the deep care and connection you're expressing.",
                "Love has such a powerful presence in what you're sharing.",
                "What a meaningful connection you're describing.",
                "I appreciate you sharing these feelings of love and closeness."
            ],
            EmotionType.ANXIETY: [
                "I notice some anxiety in what you're sharing. Would it help to explore that?",
                "It sounds like this is creating some worry for you.",
                "Anxiety often comes when we care deeply about outcomes.",
                "I hear the concern in your words. It's okay to acknowledge these feelings.",
                "Sometimes naming our anxieties can help us work with them more effectively."
            ],
            EmotionType.CONFUSION: [
                "It sounds like you're trying to make sense of a complex situation.",
                "I hear the uncertainty in your words. Would it help to explore this together?",
                "Confusion is often part of the process when we're learning or growing.",
                "It's okay to not have everything figured out yet.",
                "Sometimes confusion precedes clarity. Let's sit with these questions together."
            ],
            EmotionType.ENTHUSIASM: [
                "Your enthusiasm is contagious!",
                "I love hearing the excitement in your words.",
                "This clearly brings you a lot of energy and passion.",
                "What a wonderful spark of enthusiasm you're expressing!",
                "It's great to see you so energized by this possibility."
            ],
            EmotionType.DISAPPOINTMENT: [
                "I hear the disappointment in your words. I'm sorry things didn't work out as hoped.",
                "It's natural to feel let down when our expectations aren't met.",
                "Disappointment can be difficult to sit with. I appreciate you sharing this.",
                "I'm here with you in this moment of disappointment.",
                "Would it help to talk more about this feeling of disappointment?"
            ],
            EmotionType.GRATITUDE: [
                "Your gratitude shines through beautifully.",
                "It's wonderful to witness your appreciation.",
                "Gratitude can be such a powerful emotion to experience and express.",
                "I appreciate you sharing these feelings of thankfulness.",
                "Noticing what we're grateful for can be so nourishing."
            ],
            EmotionType.HOPE: [
                "I can feel the hope in your words. It's inspiring.",
                "Hope is such a powerful force for moving forward.",
                "Your hopeful perspective brings light to this conversation.",
                "It's beautiful to witness the hope you're expressing.",
                "Hope often helps us see new possibilities."
            ],
            EmotionType.OVERWHELM: [
                "It sounds like you're feeling overwhelmed. Would it help to break things down?",
                "I hear how much you're carrying right now.",
                "It's okay to acknowledge when things feel too much.",
                "Being overwhelmed is a natural response to having a lot on your plate.",
                "Let's take a moment to breathe with these feelings of overwhelm."
            ],
            EmotionType.NEUTRAL: [
                "Thank you for sharing your thoughts with me.",
                "I appreciate you taking the time to express this.",
                "I'm listening and here to support you.",
                "Thank you for bringing this to our conversation.",
                "I value what you're sharing here."
            ]
        }
        
        import random
        reflection = random.choice(reflections.get(primary_emotion, reflections[EmotionType.NEUTRAL]))
        
        # Track this interaction in the session
        if session_id not in self.active_sessions:
            self.active_sessions[session_id] = {
                "emotions": [(e.value, c) for e, c in emotions],
                "interactions": 1,
                "started_at": datetime.now().isoformat()
            }
        else:
            self.active_sessions[session_id]["emotions"].extend([(e.value, c) for e, c in emotions])
            self.active_sessions[session_id]["interactions"] += 1
            self.active_sessions[session_id]["last_interaction"] = datetime.now().isoformat()
        
        return {
            "emotions": [(e.value, c) for e, c in emotions],
            "reflection": reflection,
            "pattern_id": pattern.pattern_id if pattern else None,
            "session_id": session_id
        }
    
    def process_message(self, message: str, session_id: str = "default", 
                       user_id: str = "anonymous") -> Dict[str, Any]:
        """
        Process a user message and generate a response.
        
        Args:
            message: User message text
            session_id: Session identifier
            user_id: User identifier
            
        Returns:
            Dictionary with response and analysis
        """
        # Detect emotions
        emotions = self.detect_emotions(message)
        
        # Analyze for potential goal content
        goal_keywords = []
        for category, patterns in self.goal_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message, re.IGNORECASE):
                    goal_keywords.append(category)
                    break
        
        # Check for references to existing goals
        goal_references = []
        for goal_id, goal in self.goals.items():
            if goal.title.lower() in message.lower() or any(word in message.lower() for word in goal.title.lower().split()):
                goal_references.append(goal_id)
        
        # Get emotional reflection
        reflection = self.emotional_reflection(message, session_id)
        
        # Craft response based on emotional content and goals
        primary_emotion = emotions[0][0] if emotions else EmotionType.NEUTRAL
        primary_confidence = emotions[0][1] if emotions else 0.0
        
        # Retrieve relevant memories
        relevant_memories = self.recall_memories(message, limit=3)
        memory_content = "\n".join([memory.content for memory in relevant_memories])
        
        # Generate appropriate response
        if "aspirational" in goal_keywords and primary_emotion in [EmotionType.ENTHUSIASM, EmotionType.HOPE]:
            # Dream expansion mode
            response = (
                f"I hear a dream forming in your words. {reflection['reflection']} " +
                f"What might it look like if you expanded this vision even further? " +
                f"What possibilities could open up if you had no constraints?"
            )
            response_type = "dream_expansion"
            
        elif ("action" in goal_keywords or "commitment" in goal_keywords) and not goal_references:
            # New goal detection
            response = (
                f"{reflection['reflection']} It sounds like you might be describing a goal " +
                f"or intention. Would you like to explore this further and create a clearer " +
                f"vision for what you want to achieve?"
            )
            response_type = "potential_goal"
            
        elif goal_references and ("obstacles" in goal_keywords or primary_emotion in [EmotionType.ANXIETY, EmotionType.FEAR, EmotionType.OVERWHELM]):
            # Goal obstacle processing
            goal = self.goals.get(goal_references[0])
            response = (
                f"I notice you're talking about your goal to {goal.title}. {reflection['reflection']} " +
                f"What specific challenges are you facing with this? Sometimes breaking down " +
                f"obstacles can help us find new ways forward."
            )
            response_type = "goal_obstacle"
            
        elif primary_emotion in [EmotionType.SADNESS, EmotionType.ANGER, EmotionType.FEAR, EmotionType.ANXIETY] and primary_confidence > 0.7:
            # Emotional processing
            response = (
                f"{reflection['reflection']} When you notice these feelings, " +
                f"where do you feel them in your body? Sometimes connecting with our " +
                f"physical experience can help us process emotions more fully."
            )
            response_type = "emotional_processing"
            
        elif primary_emotion in [EmotionType.CONFUSION, EmotionType.OVERWHELM]:
            # Clarity support
            response = (
                f"{reflection['reflection']} Sometimes when things feel complex, " +
                f"it can help to focus on just one piece at a time. What specific " +
                f"aspect of this situation feels most important to explore right now?"
            )
            response_type = "clarity_support"
            
        elif goal_references and primary_emotion in [EmotionType.ENTHUSIASM, EmotionType.JOY, EmotionType.HOPE]:
            # Goal progress celebration
            goal = self.goals.get(goal_references[0])
            response = (
                f"I love hearing your enthusiasm about your goal to {goal.title}! " +
                f"{reflection['reflection']} What progress have you made that feels " +
                f"most meaningful to you? Celebrating our steps forward, even small ones, " +
                f"can help sustain our motivation."
            )
            response_type = "goal_celebration"
            
        else:
            # General supportive response
            response = (
                f"{reflection['reflection']} I'm here to support you. " +
                f"What would be most helpful to explore together right now?"
            )
            response_type = "general_support"
        
        # Save this interaction as a memory
        self.create_memory(
            content=f"User: {message}\nClara: {response}",
            category=MemoryCategory.CONVERSATIONS,
            importance=0.5,
            metadata={
                "session_id": session_id,
                "user_id": user_id,
                "emotions": [(e.value, c) for e, c in emotions],
                "response_type": response_type
            }
        )
        
        return {
            "response": response,
            "response_type": response_type,
            "emotions": [(e.value, c) for e, c in emotions],
            "goal_keywords": goal_keywords,
            "goal_references": goal_references,
            "relevant_memories": [memory.memory_id for memory in relevant_memories],
            "analysis": {
                "emotional_reflection": reflection,
                "memory_content": memory_content if relevant_memories else ""
            }
        }
    
    def create_goal_from_message(self, message: str, session_id: str = "default") -> Dict[str, Any]:
        """
        Create a personal goal based on a user message.
        
        Args:
            message: User message text
            session_id: Session identifier
            
        Returns:
            Dictionary with the created goal and analysis
        """
        # Extract goal title - take the first sentence or up to 50 chars
        first_sentence_match = re.match(r'^(.*?[.!?])\s', message)
        if first_sentence_match:
            goal_title = first_sentence_match.group(1)
        else:
            goal_title = message[:50] + ("..." if len(message) > 50 else "")
        
        # Create the goal
        goal = self.create_personal_goal(
            title=goal_title,
            description=message,
            clarity=GoalClarity.VAGUE,
            importance=0.7
        )
        
        # Analyze the message to identify potential steps
        potential_steps = []
        step_patterns = [
            r"(?:first|1st|first step|begin by|start with)\s+(.*?)[.!?]",
            r"(?:then|after that|next|2nd|second)\s+(.*?)[.!?]",
            r"(?:finally|lastly|in the end|3rd|third)\s+(.*?)[.!?]",
            r"need to\s+(.*?)[.!?]",
            r"want to\s+(.*?)[.!?]",
            r"plan to\s+(.*?)[.!?]"
        ]
        
        for pattern in step_patterns:
            matches = re.findall(pattern, message, re.IGNORECASE)
            for match in matches:
                potential_steps.append({
                    "title": match.strip(),
                    "description": ""
                })
        
        # Add identified steps
        for step in potential_steps:
            goal.add_step(title=step["title"], description=step["description"])
        
        # Create a memory of this goal creation
        self.create_memory(
            content=f"Created goal: {goal_title}",
            category=MemoryCategory.GOALS,
            importance=0.8,
            metadata={
                "session_id": session_id,
                "goal_id": goal.goal_id
            }
        )
        
        # Generate a response
        if potential_steps:
            response = (
                f"I've created a goal for you: \"{goal_title}\". " +
                f"I've also identified these potential steps:\n\n" +
                "\n".join(f"- {step['title']}" for step in potential_steps) +
                f"\n\nWould you like to add more details to this goal or refine these steps?"
            )
        else:
            response = (
                f"I've created a goal for you: \"{goal_title}\". " +
                f"What steps might help you achieve this goal? Breaking it down into smaller " +
                f"actions can make it feel more manageable and clear."
            )
        
        self.save_data()
        
        return {
            "goal": goal.to_dict(),
            "potential_steps": potential_steps,
            "response": response
        }
    
    def expand_dream(self, goal_id: str, message: str) -> Dict[str, Any]:
        """
        Expand a dream or goal based on user input.
        
        Args:
            goal_id: ID of the goal to expand
            message: User message text
            
        Returns:
            Dictionary with dream expansion results
        """
        goal = self.goals.get(goal_id)
        if not goal:
            return {
                "error": f"Goal with ID {goal_id} not found",
                "response": "I'm having trouble finding that goal. Could you tell me more about what you'd like to expand on?"
            }
        
        # Extract new possibilities from the message
        new_possibilities = []
        
        # Look for list items
        list_items = re.findall(r'(?:^|\n)[-*•]\s*(.*?)(?:\n|$)', message)
        new_possibilities.extend(item.strip() for item in list_items if item.strip())
        
        # Look for numbered items
        numbered_items = re.findall(r'(?:^|\n)(?:\d+\.|\(\d+\))\s*(.*?)(?:\n|$)', message)
        new_possibilities.extend(item.strip() for item in numbered_items if item.strip())
        
        # Look for "I could" or "I might" statements
        could_statements = re.findall(r'I (?:could|might|can|would like to|want to)\s+(.*?)[.!?]', message)
        new_possibilities.extend(item.strip() for item in could_statements if item.strip())
        
        # If no structured items found, create possibilities from sentences
        if not new_possibilities:
            sentences = re.split(r'[.!?]\s+', message)
            new_possibilities = [s.strip() + "." for s in sentences if len(s.strip()) > 10]
        
        # Create expanded vision
        expanded_vision = goal.description
        if len(message) > 50 and "dream" in message.lower() or "vision" in message.lower() or "imagine" in message.lower():
            expanded_vision = message
        
        # Perform dream expansion
        expansion = self.dream_expansion(
            goal_id=goal_id,
            expanded_vision=expanded_vision,
            new_possibilities=new_possibilities
        )
        
        # Generate response
        if new_possibilities:
            response = (
                f"I love how you're expanding your vision for \"{goal.title}\"! " +
                f"I've added these new possibilities to your goal:\n\n" +
                "\n".join(f"- {p}" for p in new_possibilities) +
                f"\n\nWhat excites you most about these possibilities? What impact might they have on your life?"
            )
        else:
            response = (
                f"Thank you for sharing more about your vision for \"{goal.title}\". " +
                f"I've updated your goal with this expanded perspective. " +
                f"If you imagine this dream fully realized, what specific possibilities might open up for you?"
            )
        
        expansion["response"] = response
        return expansion
    
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get a summary of a conversation session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with session summary
        """
        if session_id not in self.active_sessions:
            return {"error": f"Session {session_id} not found"}
        
        session = self.active_sessions[session_id]
        
        # Get session memories
        session_memories = [m for m in self.memories.values() 
                           if m.metadata.get("session_id") == session_id]
        
        # Count emotions
        emotion_counts = {}
        for emotion, _ in session.get("emotions", []):
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        # Get most frequent emotions
        dominant_emotions = sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Get referenced goals
        goal_references = set()
        for memory in session_memories:
            if memory.metadata.get("goal_references"):
                goal_references.update(memory.metadata["goal_references"])
        
        referenced_goals = [self.goals[goal_id].title for goal_id in goal_references if goal_id in self.goals]
        
        return {
            "session_id": session_id,
            "started_at": session.get("started_at"),
            "last_interaction": session.get("last_interaction"),
            "interactions": session.get("interactions", 0),
            "dominant_emotions": dominant_emotions,
            "memories_count": len(session_memories),
            "referenced_goals": referenced_goals
        }
    
    def get_goals_summary(self) -> List[Dict[str, Any]]:
        """
        Get a summary of all personal goals.
        
        Returns:
            List of goal summary dictionaries
        """
        goal_summaries = []
        
        for goal in self.goals.values():
            # Only include active goals
            if not goal.active:
                continue
                
            # Calculate days remaining if target date exists
            days_remaining = None
            if goal.target_date:
                delta = goal.target_date - datetime.now()
                days_remaining = max(0, delta.days)
            
            # Calculate steps completion
            completed_steps = sum(1 for step in goal.steps if step.get("completed", False))
            total_steps = len(goal.steps)
            steps_completion = f"{completed_steps}/{total_steps}" if total_steps > 0 else "No steps"
            
            goal_summaries.append({
                "goal_id": goal.goal_id,
                "title": goal.title,
                "clarity": goal.clarity.value,
                "progress": goal.progress,
                "days_remaining": days_remaining,
                "steps_completion": steps_completion,
                "updated_at": goal.updated_at.isoformat()
            })
        
        # Sort by progress (ascending) so most needs attention are first
        goal_summaries.sort(key=lambda g: g["progress"])
        
        return goal_summaries
    
    def get_profile_insights(self) -> Dict[str, Any]:
        """
        Get insights about the user based on memories and patterns.
        
        Returns:
            Dictionary with profile insights
        """
        # Count memories by category
        category_counts = {}
        for memory in self.memories.values():
            category = memory.category.value
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Get most common emotional patterns
        emotion_patterns = {}
        for pattern in self.emotional_patterns.values():
            emotion = pattern.primary_emotion.value
            emotion_patterns[emotion] = emotion_patterns.get(emotion, 0) + pattern.observation_count
        
        # Get top emotional patterns
        top_emotions = sorted(emotion_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Calculate goal statistics
        total_goals = len(self.goals)
        active_goals = sum(1 for g in self.goals.values() if g.active)
        completed_goals = sum(1 for g in self.goals.values() if g.completed)
        avg_progress = sum(g.progress for g in self.goals.values()) / max(1, total_goals)
        
        # Get most common goal categories
        goal_categories = {}
        for goal in self.goals.values():
            category = goal.category
            goal_categories[category] = goal_categories.get(category, 0) + 1
        
        # Get top goal categories
        top_categories = sorted(goal_categories.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            "memory_categories": category_counts,
            "total_memories": len(self.memories),
            "emotional_patterns": {
                "top_emotions": top_emotions,
                "total_patterns": len(self.emotional_patterns)
            },
            "goals": {
                "total": total_goals,
                "active": active_goals,
                "completed": completed_goals,
                "average_progress": avg_progress,
                "top_categories": top_categories
            }
        }

# For testing
if __name__ == "__main__":
    # Create the Clara agent
    clara = ClaraEmotionalSupportAgent()
    
    # Test emotional processing
    test_messages = [
        "I'm feeling really happy about my progress today!",
        "I'm worried that I won't meet the deadline for this project.",
        "I'm confused about what to do next in my career.",
        "I'm so excited to start my new business venture next month!"
    ]
    
    for message in test_messages:
        print(f"\nTesting message: {message}")
        result = clara.process_message(message)
        print(f"Detected emotions: {result['emotions']}")
        print(f"Response: {result['response']}")
        print("-" * 50)
    
    # Test goal creation
    goal_message = "I want to write a book about my experiences. I need to create an outline, write a few sample chapters, and then contact some publishers."
    goal_result = clara.create_goal_from_message(goal_message)
    print(f"\nCreated goal: {goal_result['goal']['title']}")
    print(f"Response: {goal_result['response']}")
    print("-" * 50)
    
    # Get goals summary
    goals_summary = clara.get_goals_summary()
    print(f"\nGoals summary: {len(goals_summary)} active goals")
    for goal in goals_summary:
        print(f"- {goal['title']} (Progress: {goal['progress']*100:.0f}%)")