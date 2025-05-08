"""
Natural Language Processing Engine
Provides advanced NLP capabilities for understanding and processing human language.
"""

import os
import json
import re
import logging
import string
from typing import List, Dict, Any, Optional, Union, Tuple, Set
from enum import Enum
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class IntentType(Enum):
    """Types of intents that can be detected in user messages."""
    GREETING = "greeting"
    FAREWELL = "farewell"
    QUESTION = "question"
    COMMAND = "command"
    REQUEST = "request"
    STATEMENT = "statement"
    CLARIFICATION = "clarification"
    AGREEMENT = "agreement"
    DISAGREEMENT = "disagreement"
    COMPLAINT = "complaint"
    GRATITUDE = "gratitude"
    APOLOGY = "apology"
    FEEDBACK = "feedback"
    HELP = "help_request"
    GOAL_CREATION = "goal_creation"
    AGENT_MANAGEMENT = "agent_management"
    SMALL_TALK = "small_talk"
    TASK_AUTOMATION = "task_automation"
    WEB_SCRAPING = "web_scraping"
    DATA_ANALYSIS = "data_analysis"
    DOCUMENT_PROCESSING = "document_processing"
    VIDEO_GENERATION = "video_generation"
    PROJECT_PLANNING = "project_planning"
    EMOTIONAL_SUPPORT = "emotional_support"
    UNCERTAIN = "uncertain"

class EntityType(Enum):
    """Types of entities that can be extracted from text."""
    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    DATE = "date"
    TIME = "time"
    DURATION = "duration"
    NUMBER = "number"
    PERCENTAGE = "percentage"
    MONEY = "money"
    URL = "url"
    EMAIL = "email"
    PHONE = "phone"
    PRODUCT = "product"
    EVENT = "event"
    GOAL = "goal"
    TASK = "task"
    PROJECT = "project"
    AGENT = "agent"
    TEAM = "team"
    SKILL = "skill"
    CAPABILITY = "capability"
    CUSTOM = "custom"

class SentimentType(Enum):
    """Types of sentiment that can be detected in text."""
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"

class Entity:
    """Represents a named entity extracted from text."""
    
    def __init__(self, 
                text: str,
                entity_type: EntityType,
                start_pos: int,
                end_pos: int,
                confidence: float = 1.0,
                metadata: Dict[str, Any] = None):
        """
        Initialize an entity.
        
        Args:
            text: The entity text
            entity_type: Type of entity
            start_pos: Start position in the original text
            end_pos: End position in the original text
            confidence: Confidence score (0.0-1.0)
            metadata: Additional metadata
        """
        self.text = text
        self.entity_type = entity_type
        self.start_pos = start_pos
        self.end_pos = end_pos
        self.confidence = confidence
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "text": self.text,
            "entity_type": self.entity_type.value,
            "start_pos": self.start_pos,
            "end_pos": self.end_pos,
            "confidence": self.confidence,
            "metadata": self.metadata
        }

class Intent:
    """Represents a detected intent in user input."""
    
    def __init__(self, 
                intent_type: IntentType,
                confidence: float,
                text: str = None,
                entities: List[Entity] = None,
                slots: Dict[str, Any] = None):
        """
        Initialize an intent.
        
        Args:
            intent_type: Type of intent
            confidence: Confidence score (0.0-1.0)
            text: The text that triggered this intent
            entities: List of entities related to this intent
            slots: Named parameters extracted from the intent
        """
        self.intent_type = intent_type
        self.confidence = confidence
        self.text = text
        self.entities = entities or []
        self.slots = slots or {}
        self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "intent_type": self.intent_type.value,
            "confidence": self.confidence,
            "text": self.text,
            "entities": [entity.to_dict() for entity in self.entities],
            "slots": self.slots,
            "timestamp": self.timestamp.isoformat()
        }
    
    def add_entity(self, entity: Entity):
        """Add an entity to this intent."""
        self.entities.append(entity)
    
    def add_slot(self, name: str, value: Any):
        """Add a slot (parameter) to this intent."""
        self.slots[name] = value

class NLPEngine:
    """
    Natural Language Processing Engine for understanding user input,
    detecting intents, extracting entities, and analyzing sentiment.
    """
    
    def __init__(self):
        """Initialize the NLP Engine."""
        self.data_dir = "./data/nlp"
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Load language data files
        self.stopwords = self._load_stopwords()
        
        # Define intent patterns
        self.intent_patterns = {
            IntentType.GREETING: [
                r"^(?:hello|hi|hey|greetings|good\s+(?:morning|afternoon|evening))[\s,!.]*$",
                r"^(?:what's up|howdy|yo|hiya)[\s,!.]*$"
            ],
            IntentType.FAREWELL: [
                r"^(?:goodbye|bye|see\s+you|farewell|later|take\s+care)[\s,!.]*$",
                r"^(?:have\s+a\s+(?:good|nice|great)\s+(?:day|night|weekend))[\s,!.]*$"
            ],
            IntentType.QUESTION: [
                r"^(?:who|what|when|where|why|how|is|are|can|could|would|will|should|do|does|did|has|have|had|may|might)\b.*\?$",
                r".*\?$"
            ],
            IntentType.COMMAND: [
                r"^(?:please\s+)?(?:show|display|list|find|search|create|update|delete|remove|add|send|start|stop|pause|resume|execute|run)\b.*[.!]?$"
            ],
            IntentType.REQUEST: [
                r"^(?:please|kindly|would\s+you|could\s+you|can\s+you|i\s+would\s+like\s+you\s+to|i\s+want\s+you\s+to)\b.*[.!?]?$"
            ],
            IntentType.HELP: [
                r"^(?:help|assist|support|i\s+need\s+help|can\s+you\s+help|how\s+do\s+i|how\s+can\s+i)\b.*[.!?]?$"
            ],
            IntentType.GOAL_CREATION: [
                r"^(?:i\s+want\s+to|i\s+need\s+to|i\s+plan\s+to|i\s+would\s+like\s+to|my\s+goal\s+is|create\s+a\s+goal|new\s+goal)\b.*[.!?]?$"
            ],
            IntentType.AGENT_MANAGEMENT: [
                r"(?:agent|team|assign|create\s+a\s+team|form\s+a\s+team|manage\s+agents?|find\s+an?\s+agent)"
            ],
            IntentType.TASK_AUTOMATION: [
                r"(?:automate|schedule|recurring|daily|weekly|monthly|every|repeat|automated\s+task)"
            ],
            IntentType.WEB_SCRAPING: [
                r"(?:scrape|crawl|extract\s+(?:data|content|information)|gather\s+data|collect\s+data|scraping|web\s+data)"
            ],
            IntentType.DATA_ANALYSIS: [
                r"(?:analyze|analysis|chart|graph|visualization|statistics|trend|patterns|correlate|plot|dashboard)"
            ],
            IntentType.DOCUMENT_PROCESSING: [
                r"(?:document|pdf|extract\s+text|ocr|scan|parse\s+document|extract\s+from\s+(?:pdf|document))"
            ],
            IntentType.VIDEO_GENERATION: [
                r"(?:video|animation|create\s+a\s+video|generate\s+video|make\s+a\s+video|edit\s+video|animate)"
            ],
            IntentType.PROJECT_PLANNING: [
                r"(?:project\s+plan|timeline|milestone|task\s+breakdown|project\s+management|gantt|planning|roadmap)"
            ],
            IntentType.EMOTIONAL_SUPPORT: [
                r"(?:feel|feeling|sad|happy|angry|anxious|worried|stressed|overwhelmed|confused|scared|afraid|emotional|support|listen)"
            ],
        }
        
        # Entity recognition patterns
        self.entity_patterns = {
            EntityType.PERSON: [
                r"(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?",
                r"[A-Z][a-z]+\s+[A-Z][a-z]+"
            ],
            EntityType.ORGANIZATION: [
                r"(?:Google|Apple|Microsoft|Amazon|Facebook|Netflix|Tesla|IBM|Intel|Oracle|Samsung|Sony|Ford|Toyota|Honda|Boeing|Airbus|Walmart|Target|Costco|Bank\s+of\s+America|JP\s+Morgan|Goldman\s+Sachs|Morgan\s+Stanley|Citigroup|Wells\s+Fargo|American\s+Express|Visa|Mastercard|PayPal|Stripe|Square|Twitter|Instagram|TikTok|LinkedIn|Reddit|Discord|Slack|Zoom|Microsoft\s+Teams|Skype)",
                r"[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]+)+\s+(?:Inc\.|Corp\.|LLC|Ltd\.|Limited|Company|Co\.|Group|Holdings|Corporation|Association)"
            ],
            EntityType.LOCATION: [
                r"\b(?:New\s+York|Los\s+Angeles|Chicago|Houston|Phoenix|Philadelphia|San\s+Antonio|San\s+Diego|Dallas|San\s+Jose|Austin|Jacksonville|San\s+Francisco|Columbus|Fort\s+Worth|Charlotte|Detroit|El\s+Paso|Memphis|Seattle|Denver|Washington\s+DC|Boston|Nashville|Baltimore|Oklahoma\s+City|Louisville|Portland|Las\s+Vegas|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Long\s+Beach|Kansas\s+City|Mesa|Atlanta|Colorado\s+Springs|Raleigh|Omaha|Miami|Oakland|Minneapolis|Tulsa|Cleveland|Wichita|Arlington|New\s+Orleans)\b",
                r"\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s+Hampshire|New\s+Jersey|New\s+Mexico|New\s+York|North\s+Carolina|North\s+Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s+Island|South\s+Carolina|South\s+Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s+Virginia|Wisconsin|Wyoming)\b",
                r"\b(?:USA|United\s+States|Canada|Mexico|UK|United\s+Kingdom|England|France|Germany|Italy|Spain|China|Japan|South\s+Korea|Australia|Brazil|India|Russia|Sweden|Norway|Finland|Denmark|Greece|Turkey|Egypt|Saudi\s+Arabia|Israel|Pakistan|Indonesia|Singapore|Malaysia|Thailand|Philippines|Vietnam|South\s+Africa|Nigeria|Kenya|Ghana|Dubai|UAE|Qatar|Bahrain|Kuwait|Oman)\b"
            ],
            EntityType.DATE: [
                r"\b\d{1,2}/\d{1,2}/\d{2,4}\b",  # MM/DD/YYYY or DD/MM/YYYY
                r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b",  # Month DD, YYYY
                r"\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b",  # Days of week
                r"\b(?:today|tomorrow|yesterday|next\s+week|last\s+week|next\s+month|last\s+month|next\s+year|last\s+year)\b"  # Relative dates
            ],
            EntityType.TIME: [
                r"\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b",  # HH:MM:SS AM/PM
                r"\b(?:noon|midnight|morning|afternoon|evening|night)\b"  # Time periods
            ],
            EntityType.DURATION: [
                r"\b\d+\s+(?:second|minute|hour|day|week|month|year|decade)s?\b",
                r"\b(?:a\s+few|several)\s+(?:seconds|minutes|hours|days|weeks|months|years|decades)\b"
            ],
            EntityType.NUMBER: [
                r"\b\d+(?:\.\d+)?\b",  # Integers and decimals
                r"\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)\b"  # Number words
            ],
            EntityType.PERCENTAGE: [
                r"\b\d+(?:\.\d+)?\s*%\b",  # 50% or 50.5%
                r"\b\d+(?:\.\d+)?\s+percent\b"  # 50 percent or 50.5 percent
            ],
            EntityType.MONEY: [
                r"\$\d+(?:\.\d{2})?\b",  # $50 or $50.00
                r"\b\d+(?:\.\d{2})?\s+(?:dollars|USD|EUR|GBP|JPY|CNY|AUD|CAD)\b"  # 50 dollars, 50 USD, etc.
            ],
            EntityType.URL: [
                r"https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)",
                r"www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)"
            ],
            EntityType.EMAIL: [
                r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
            ],
            EntityType.PHONE: [
                r"\b\+?1?\s*\(?(?:\d{3})\)?[\s.-]?\d{3}[\s.-]?\d{4}\b"  # +1 (123) 456-7890, (123) 456-7890, 123-456-7890, etc.
            ],
            EntityType.GOAL: [
                r"goal\s+to\s+[^.,;!?]+",
                r"objective\s+(?:to|is)\s+[^.,;!?]+"
            ],
            EntityType.TASK: [
                r"task\s+to\s+[^.,;!?]+",
                r"need\s+to\s+[^.,;!?]+"
            ],
            EntityType.PROJECT: [
                r"project\s+(?:to|on|for)\s+[^.,;!?]+",
                r"initiative\s+(?:to|on|for)\s+[^.,;!?]+"
            ],
            EntityType.AGENT: [
                r"(?:research|planning|creative|coding|writing|data|design|video|document)\s+agent"
            ],
            EntityType.TEAM: [
                r"(?:research|planning|creative|coding|writing|data|design|video|document)\s+team"
            ],
            EntityType.SKILL: [
                r"skill\s+in\s+[^.,;!?]+",
                r"(?:coding|programming|writing|design|research|analysis|planning|communication|problem[\s-]solving|critical[\s-]thinking|creativity|leadership|teamwork|time[\s-]management|project[\s-]management)\s+skill"
            ],
            EntityType.CAPABILITY: [
                r"capable\s+of\s+[^.,;!?]+",
                r"ability\s+to\s+[^.,;!?]+"
            ]
        }
    
    def _load_stopwords(self) -> Set[str]:
        """Load stopwords for text processing."""
        # Common English stopwords
        stopwords = {
            "a", "an", "the", "and", "or", "but", "if", "because", "as", "until", "while",
            "of", "at", "by", "for", "with", "about", "against", "between", "into", "through",
            "during", "before", "after", "above", "below", "to", "from", "up", "down", "in",
            "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
            "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
            "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
            "than", "too", "very", "s", "t", "can", "will", "just", "don", "don't", "should",
            "now", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
            "my", "your", "his", "its", "our", "their", "this", "that", "these", "those", "am",
            "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
            "do", "does", "did", "doing", "what", "which", "who", "whom", "this", "that", "these",
            "those", "would", "could", "should", "might", "let", "let's"
        }
        
        return stopwords
    
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess text for analysis.
        
        Args:
            text: Input text
            
        Returns:
            Preprocessed text
        """
        # Convert to lowercase
        text = text.lower()
        
        # Remove punctuation (except for apostrophes in contractions)
        text = re.sub(r'[^\w\s\']', ' ', text)
        
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Trim whitespace
        text = text.strip()
        
        return text
    
    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into words.
        
        Args:
            text: Input text
            
        Returns:
            List of tokens
        """
        # Simple whitespace tokenization
        tokens = text.split()
        
        return tokens
    
    def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """
        Remove stopwords from a list of tokens.
        
        Args:
            tokens: List of tokens
            
        Returns:
            List of tokens with stopwords removed
        """
        return [token for token in tokens if token not in self.stopwords]
    
    def extract_keywords(self, text: str, top_n: int = 10) -> List[Tuple[str, float]]:
        """
        Extract keywords from text.
        
        Args:
            text: Input text
            top_n: Maximum number of keywords to return
            
        Returns:
            List of (keyword, score) tuples
        """
        # Preprocess text
        processed_text = self.preprocess_text(text)
        
        # Tokenize
        tokens = self.tokenize(processed_text)
        
        # Remove stopwords
        filtered_tokens = self.remove_stopwords(tokens)
        
        # Count token frequencies
        token_counts = {}
        for token in filtered_tokens:
            token_counts[token] = token_counts.get(token, 0) + 1
        
        # Calculate TF (Term Frequency) scores
        total_tokens = len(filtered_tokens) or 1  # Avoid division by zero
        scored_tokens = [(token, count / total_tokens) for token, count in token_counts.items()]
        
        # Sort by score (descending)
        scored_tokens.sort(key=lambda x: x[1], reverse=True)
        
        # Return top_n keywords
        return scored_tokens[:top_n]
    
    def detect_intent(self, text: str) -> Intent:
        """
        Detect the primary intent in text.
        
        Args:
            text: Input text
            
        Returns:
            Intent object
        """
        # Initialize with uncertain intent
        best_intent = IntentType.UNCERTAIN
        best_confidence = 0.3  # Default confidence for uncertain intent
        
        # Check each intent pattern
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    # Calculate confidence based on pattern match and other factors
                    match_length = match.end() - match.start()
                    text_coverage = match_length / len(text)
                    pattern_confidence = 0.5 + (0.4 * text_coverage)  # 0.5-0.9 range
                    
                    # Boost confidence for specific patterns
                    if intent_type == IntentType.QUESTION and text.endswith("?"):
                        pattern_confidence += 0.1
                    elif intent_type == IntentType.COMMAND and re.search(r'^(?:please\s+)?\w+\b', text):
                        pattern_confidence += 0.1
                    
                    # Ensure confidence doesn't exceed 1.0
                    pattern_confidence = min(0.95, pattern_confidence)
                    
                    # Update best intent if confidence is higher
                    if pattern_confidence > best_confidence:
                        best_intent = intent_type
                        best_confidence = pattern_confidence
        
        # Fallback heuristics for intents not matched by patterns
        if best_intent == IntentType.UNCERTAIN:
            # Check for statement-like structures
            if re.search(r'^(?:i|we|they|you|he|she|it)\s+(?:am|are|is|was|were|have|has|had)', text, re.IGNORECASE):
                best_intent = IntentType.STATEMENT
                best_confidence = 0.6
        
        # Create the intent object
        intent = Intent(intent_type=best_intent, confidence=best_confidence, text=text)
        
        # Extract entities related to this intent
        entities = self.extract_entities(text)
        for entity in entities:
            intent.add_entity(entity)
        
        # Extract slots (parameters) related to this intent
        self._extract_slots(text, intent)
        
        return intent
    
    def extract_entities(self, text: str) -> List[Entity]:
        """
        Extract entities from text.
        
        Args:
            text: Input text
            
        Returns:
            List of Entity objects
        """
        entities = []
        
        # Check each entity pattern
        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    entity_text = match.group(0)
                    start_pos = match.start()
                    end_pos = match.end()
                    
                    # Determine confidence
                    confidence = 0.8  # Base confidence
                    
                    # Create entity
                    entity = Entity(
                        text=entity_text,
                        entity_type=entity_type,
                        start_pos=start_pos,
                        end_pos=end_pos,
                        confidence=confidence
                    )
                    
                    entities.append(entity)
        
        # Sort entities by start position
        entities.sort(key=lambda e: e.start_pos)
        
        # Remove overlapping entities, keeping the one with higher confidence
        filtered_entities = []
        for entity in entities:
            overlapping = False
            for existing_entity in filtered_entities:
                # Check for overlap
                if (entity.start_pos <= existing_entity.end_pos and 
                    entity.end_pos >= existing_entity.start_pos):
                    
                    overlapping = True
                    # If new entity has higher confidence, replace the existing one
                    if entity.confidence > existing_entity.confidence:
                        filtered_entities.remove(existing_entity)
                        filtered_entities.append(entity)
                    break
            
            if not overlapping:
                filtered_entities.append(entity)
        
        return filtered_entities
    
    def _extract_slots(self, text: str, intent: Intent):
        """
        Extract slots (parameters) related to an intent.
        
        Args:
            text: Input text
            intent: Intent object to update with slots
        """
        # Extract different slot types based on intent type
        if intent.intent_type == IntentType.GOAL_CREATION:
            # Extract goal description
            goal_match = re.search(r'(?:i\s+want\s+to|i\s+need\s+to|i\s+plan\s+to|i\s+would\s+like\s+to|my\s+goal\s+is)\s+(.*?)(?:\.|\?|!|$)', text, re.IGNORECASE)
            if goal_match:
                intent.add_slot("goal_description", goal_match.group(1).strip())
            
            # Extract deadline if present
            deadline_match = re.search(r'(?:by|before|until)\s+(.*?)(?:\.|\?|!|$)', text, re.IGNORECASE)
            if deadline_match:
                intent.add_slot("deadline", deadline_match.group(1).strip())
        
        elif intent.intent_type == IntentType.COMMAND or intent.intent_type == IntentType.REQUEST:
            # Extract object of command/request
            for verb in ["show", "display", "list", "find", "search", "create", "update", "delete", "remove", "add", "send", "start", "stop", "run"]:
                verb_match = re.search(f'{verb}\\s+(.*?)(?:\\.|\\?|!|$)', text, re.IGNORECASE)
                if verb_match:
                    intent.add_slot("command_object", verb_match.group(1).strip())
                    intent.add_slot("command_verb", verb)
                    break
        
        elif intent.intent_type == IntentType.QUESTION:
            # Extract question focus
            question_word_match = re.search(r'^(who|what|when|where|why|how)\b', text, re.IGNORECASE)
            if question_word_match:
                intent.add_slot("question_type", question_word_match.group(1).lower())
            
            # Extract subject of question
            subject_match = re.search(r'^(?:who|what|when|where|why|how)\s+(?:is|are|was|were|do|does|did|has|have|had|can|could|would|will|should)\s+(.*?)(?:\.|$)', text, re.IGNORECASE)
            if subject_match:
                intent.add_slot("question_subject", subject_match.group(1).strip())
        
        elif intent.intent_type == IntentType.WEB_SCRAPING:
            # Extract what to scrape
            scrape_match = re.search(r'(?:scrape|crawl|extract|gather|collect)\s+(.*?)(?:from|on|at|\.|\?|!|$)', text, re.IGNORECASE)
            if scrape_match:
                intent.add_slot("scrape_target", scrape_match.group(1).strip())
            
            # Extract source to scrape from
            source_match = re.search(r'(?:from|on|at)\s+(.*?)(?:\.|\?|!|$)', text, re.IGNORECASE)
            if source_match:
                intent.add_slot("scrape_source", source_match.group(1).strip())
        
        elif intent.intent_type == IntentType.DATA_ANALYSIS:
            # Extract data to analyze
            analysis_match = re.search(r'(?:analyze|analyze|run\s+analysis\s+on|create\s+chart\s+for|visualize)\s+(.*?)(?:\.|\?|!|$)', text, re.IGNORECASE)
            if analysis_match:
                intent.add_slot("analysis_target", analysis_match.group(1).strip())
            
            # Extract analysis type
            type_matches = [
                (r'(?:bar|pie|line|scatter|histogram)\s+(?:chart|graph|plot)', "chart_type"),
                (r'(?:trend|correlation|regression|comparative)\s+analysis', "analysis_type"),
                (r'(?:cluster|classify|predict|forecast)', "ml_operation")
            ]
            
            for pattern, slot_name in type_matches:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    intent.add_slot(slot_name, match.group(0).strip())
        
        elif intent.intent_type == IntentType.VIDEO_GENERATION:
            # Extract video description
            video_match = re.search(r'(?:video|animation)\s+(?:of|about|showing|with)\s+(.*?)(?:\.|\?|!|$)', text, re.IGNORECASE)
            if video_match:
                intent.add_slot("video_description", video_match.group(1).strip())
            
            # Extract video parameters
            for param, pattern in [
                ("video_style", r'(?:style|look|aesthetic):\s*(.*?)(?:,|\.|\?|!|$)'),
                ("video_length", r'(?:length|duration):\s*(.*?)(?:,|\.|\?|!|$)'),
                ("video_resolution", r'(?:resolution|quality):\s*(.*?)(?:,|\.|\?|!|$)')
            ]:
                param_match = re.search(pattern, text, re.IGNORECASE)
                if param_match:
                    intent.add_slot(param, param_match.group(1).strip())
    
    def extract_phrases(self, text: str, phrase_type: str = "noun_phrases") -> List[str]:
        """
        Extract phrases of a specific type from text.
        
        Args:
            text: Input text
            phrase_type: Type of phrases to extract (noun_phrases, verb_phrases, etc.)
            
        Returns:
            List of extracted phrases
        """
        phrases = []
        
        if phrase_type == "noun_phrases":
            # Simplified noun phrase extraction using regex patterns
            # This would be better with a proper POS tagger, but for a demo this works
            np_patterns = [
                r'(?:the|a|an|my|your|his|her|their|our|its)\s+(?:\w+\s+){0,2}\w+',  # Determiner + optional adjectives + noun
                r'(?:\w+\s+){0,2}(?:process|system|method|approach|technique|strategy|plan|idea|concept|theory|framework|model|design|structure|function|feature|capability|tool|resource)'  # Common nouns with optional modifiers
            ]
            
            for pattern in np_patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    phrases.append(match.group(0))
        
        elif phrase_type == "verb_phrases":
            # Simplified verb phrase extraction
            vp_patterns = [
                r'(?:will|would|could|should|can|must|might|may|going\s+to)\s+\w+',  # Modal + verb
                r'(?:am|is|are|was|were|have|has|had)\s+(?:\w+ing|\w+ed|\w+en)'  # Be/Have + participle
            ]
            
            for pattern in vp_patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    phrases.append(match.group(0))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_phrases = []
        for phrase in phrases:
            if phrase not in seen:
                seen.add(phrase)
                unique_phrases.append(phrase)
        
        return unique_phrases
    
    def analyze_sentiment(self, text: str) -> Tuple[SentimentType, float]:
        """
        Analyze the sentiment of text.
        
        Args:
            text: Input text
            
        Returns:
            Tuple of (sentiment_type, confidence)
        """
        # Simplified sentiment analysis using lexicon-based approach
        
        # Positive and negative word lists
        positive_words = {
            "good", "great", "excellent", "amazing", "wonderful", "fantastic", "terrific", 
            "outstanding", "brilliant", "exceptional", "marvelous", "fabulous", "superb",
            "perfect", "better", "best", "happy", "glad", "pleased", "delighted", "satisfied",
            "enjoy", "enjoyed", "love", "loved", "like", "liked", "awesome", "impressive",
            "impressive", "right", "correct", "accurate", "positive", "beneficial", "improvement",
            "improve", "improved", "success", "successful", "well", "fortune", "fortunate", "ideal",
            "worthy", "worthwhile", "valuable", "nice", "pleasant", "pleasing", "satisfying",
            "attractive", "appealing", "desirable", "agree", "excited", "exciting", "fun", "beautiful",
            "excellent", "exceptional", "extraordinary", "favorable", "incredible", "outstanding", 
            "remarkable", "phenomenal", "tremendous", "sensational", "spectacular"
        }
        
        negative_words = {
            "bad", "terrible", "horrible", "awful", "poorly", "poor", "worse", "worst",
            "disappointed", "disappointing", "unhappy", "sad", "upset", "unfortunate",
            "problem", "issue", "difficult", "hard", "trouble", "fail", "failed", "failure",
            "mess", "messy", "wrong", "incorrect", "inaccurate", "negative", "damage",
            "damaged", "disappointing", "disappointed", "not", "can't", "cannot", "don't",
            "doesn't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't",
            "won't", "wouldn't", "shouldn't", "couldn't", "never", "no", "none", "nothing",
            "hate", "dislike", "annoying", "annoyed", "angry", "mad", "frustrating", "frustrated",
            "abysmal", "appalling", "atrocious", "dreadful", "inadequate", "inferior", 
            "unfavorable", "unsatisfactory", "defective", "deficient", "mediocre", "rubbish",
            "useless", "worthless", "garbage", "trash", "junk", "crap", "disaster", "catastrophe"
        }
        
        # Intensifiers and diminishers
        intensifiers = {
            "very", "extremely", "incredibly", "really", "absolutely", "completely", "totally",
            "entirely", "especially", "particularly", "immensely", "enormously", "exceedingly"
        }
        
        diminishers = {
            "somewhat", "slightly", "a bit", "a little", "fairly", "rather", "quite", "kind of",
            "sort of", "marginally", "partially", "hardly", "barely", "scarcely"
        }
        
        # Negators
        negators = {
            "not", "no", "never", "none", "neither", "nor", "nothing", "nowhere", "without"
        }
        
        # Preprocess text
        processed_text = self.preprocess_text(text)
        
        # Tokenize
        tokens = self.tokenize(processed_text)
        
        # Calculate sentiment score
        sentiment_score = 0
        negation = False
        intensifier = False
        
        for i, token in enumerate(tokens):
            # Check for negators
            if token in negators:
                negation = True
                continue
            
            # Check for intensifiers/diminishers
            if token in intensifiers:
                intensifier = True
                continue
            elif token in diminishers:
                intensifier = False
                continue
            
            # Calculate token score
            token_score = 0
            if token in positive_words:
                token_score = 1
            elif token in negative_words:
                token_score = -1
            
            # Apply negation
            if negation:
                token_score = -token_score
                negation = False  # Reset negation
            
            # Apply intensification
            if intensifier:
                token_score *= 1.5
                intensifier = False  # Reset intensifier
            
            sentiment_score += token_score
        
        # Normalize score to range [-1, 1]
        max_possible_score = len(tokens)
        if max_possible_score > 0:
            normalized_score = sentiment_score / max_possible_score
        else:
            normalized_score = 0
        
        # Determine sentiment type and confidence
        if normalized_score >= 0.5:
            sentiment_type = SentimentType.VERY_POSITIVE
            confidence = min(0.95, 0.7 + abs(normalized_score) / 2)
        elif 0 < normalized_score < 0.5:
            sentiment_type = SentimentType.POSITIVE
            confidence = 0.5 + abs(normalized_score) / 2
        elif normalized_score == 0:
            sentiment_type = SentimentType.NEUTRAL
            confidence = 0.6
        elif -0.5 < normalized_score < 0:
            sentiment_type = SentimentType.NEGATIVE
            confidence = 0.5 + abs(normalized_score) / 2
        else:  # normalized_score <= -0.5
            sentiment_type = SentimentType.VERY_NEGATIVE
            confidence = min(0.95, 0.7 + abs(normalized_score) / 2)
        
        return sentiment_type, confidence
    
    def extract_topic(self, text: str) -> Tuple[str, float]:
        """
        Extract the main topic from text.
        
        Args:
            text: Input text
            
        Returns:
            Tuple of (topic, confidence)
        """
        # Extract keywords
        keywords = self.extract_keywords(text, top_n=5)
        
        if not keywords:
            return "general", 0.3
        
        # Common topics
        topic_keywords = {
            "technology": ["software", "hardware", "tech", "computer", "digital", "ai", "ml", "data", "app", "web", "device", "program", "code", "algorithm", "system"],
            "business": ["company", "business", "market", "industry", "product", "service", "customer", "client", "sales", "profit", "revenue", "startup", "enterprise", "management"],
            "finance": ["money", "finance", "investment", "investor", "stock", "market", "fund", "bank", "loan", "debt", "credit", "payment", "transaction", "trading"],
            "health": ["health", "medical", "doctor", "patient", "hospital", "treatment", "medicine", "disease", "symptom", "therapy", "wellness", "fitness", "diet", "exercise"],
            "education": ["education", "school", "student", "teacher", "learn", "class", "course", "study", "training", "knowledge", "skill", "academic", "university", "college"],
            "science": ["science", "scientific", "research", "experiment", "theory", "physics", "chemistry", "biology", "astronomy", "mathematics", "discovery", "innovation"],
            "politics": ["politics", "government", "political", "policy", "law", "election", "vote", "campaign", "party", "candidate", "president", "congress", "senate", "legislation"],
            "arts": ["art", "music", "film", "movie", "book", "novel", "artist", "author", "writer", "actor", "director", "painting", "literature", "creative", "entertainment"],
            "sports": ["sport", "team", "player", "game", "match", "competition", "tournament", "athlete", "win", "score", "championship", "league", "coach", "training"],
            "travel": ["travel", "destination", "trip", "journey", "tour", "tourist", "vacation", "holiday", "flight", "hotel", "resort", "adventure", "explore", "sightseeing"],
            "food": ["food", "drink", "meal", "recipe", "restaurant", "chef", "cooking", "baking", "ingredient", "dish", "flavor", "taste", "cuisine", "diet", "nutrition"],
            "social": ["social", "community", "network", "relationship", "communication", "interaction", "friend", "family", "society", "culture", "tradition", "connection"],
            "environment": ["environment", "nature", "climate", "green", "eco", "sustainable", "conservation", "pollution", "waste", "energy", "renewable", "recycle", "planet", "earth"]
        }
        
        # Count keyword matches for each topic
        topic_scores = {}
        for topic, topic_kws in topic_keywords.items():
            score = 0
            for kw, kw_score in keywords:
                if kw in topic_kws:
                    score += kw_score
                else:
                    # Check for partial matches
                    for topic_kw in topic_kws:
                        if kw in topic_kw or topic_kw in kw:
                            score += kw_score * 0.5
                            break
            
            if score > 0:
                topic_scores[topic] = score
        
        # If no topic matches found, use the top keyword as the topic
        if not topic_scores:
            return keywords[0][0], 0.4
        
        # Find the topic with the highest score
        best_topic = max(topic_scores.items(), key=lambda x: x[1])
        
        # Calculate confidence (0.5-0.9 range)
        confidence = min(0.9, 0.5 + best_topic[1])
        
        return best_topic[0], confidence
    
    def process_text(self, text: str) -> Dict[str, Any]:
        """
        Process text and extract comprehensive information.
        
        Args:
            text: Input text
            
        Returns:
            Dictionary containing analysis results
        """
        # Detect intent
        intent = self.detect_intent(text)
        
        # Extract entities
        entities = self.extract_entities(text)
        
        # Analyze sentiment
        sentiment_type, sentiment_confidence = self.analyze_sentiment(text)
        
        # Extract topic
        topic, topic_confidence = self.extract_topic(text)
        
        # Extract keywords
        keywords = self.extract_keywords(text)
        
        # Extract phrases
        noun_phrases = self.extract_phrases(text, phrase_type="noun_phrases")
        verb_phrases = self.extract_phrases(text, phrase_type="verb_phrases")
        
        # Compile results
        return {
            "intent": intent.to_dict(),
            "entities": [entity.to_dict() for entity in entities],
            "sentiment": {
                "type": sentiment_type.value,
                "confidence": sentiment_confidence
            },
            "topic": {
                "name": topic,
                "confidence": topic_confidence
            },
            "keywords": keywords,
            "phrases": {
                "noun_phrases": noun_phrases,
                "verb_phrases": verb_phrases
            },
            "original_text": text,
            "processed_at": datetime.now().isoformat()
        }

# For testing
if __name__ == "__main__":
    # Create the NLP Engine
    nlp = NLPEngine()
    
    # Test with some example inputs
    test_texts = [
        "What is the weather forecast for New York tomorrow?",
        "Please create a new project for developing a mobile app.",
        "I want to scrape product information from the Amazon website.",
        "I'm feeling really happy about the progress we've made today!",
        "Can you generate a video showing how our product works?",
        "I need to write a book about artificial intelligence by December 15th."
    ]
    
    for text in test_texts:
        print(f"\nProcessing: {text}")
        result = nlp.process_text(text)
        
        print(f"Intent: {result['intent']['intent_type']} (confidence: {result['intent']['confidence']:.2f})")
        print(f"Sentiment: {result['sentiment']['type']} (confidence: {result['sentiment']['confidence']:.2f})")
        print(f"Topic: {result['topic']['name']} (confidence: {result['topic']['confidence']:.2f})")
        
        if result['entities']:
            print("Entities:")
            for entity in result['entities']:
                print(f"  - {entity['text']} ({entity['entity_type']})")
        
        if result['intent']['slots']:
            print("Slots:")
            for slot_name, slot_value in result['intent']['slots'].items():
                print(f"  - {slot_name}: {slot_value}")
        
        print("-" * 50)