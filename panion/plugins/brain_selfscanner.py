"""
Brain Self Scanner Plugin
Performs self-analysis and skill scanning to identify capabilities and areas for improvement.
"""

import logging
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import json
import yaml
import ast
import inspect
import importlib
from dataclasses import dataclass, field
from datetime import datetime

from core.plugin.base import BasePlugin

@dataclass
class SkillAnalysis:
    """Data class for skill analysis results."""
    name: str
    description: str
    category: str
    confidence: float
    usage_count: int
    dependencies: List[str]
    required_capabilities: List[str]
    implementation_path: str

class BrainSelfScanner(BasePlugin):
    def __init__(self, config_path: str = "config/scanner_config.yaml"):
        super().__init__(
            name="BrainSelfScanner",
            version="1.0.0",
            description="Performs self-analysis and skill scanning",
            author="Panion Team"
        )
        self.logger = logging.getLogger(__name__)
        self.config = self._load_config(config_path)
        self.skills_file = Path("data/skills.json")
        self.skills_file.parent.mkdir(parents=True, exist_ok=True)
        self.skill_categories = {
            "data_processing": ["pandas", "numpy", "sklearn"],
            "web": ["requests", "aiohttp", "beautifulsoup4"],
            "system": ["os", "sys", "subprocess"],
            "async": ["asyncio", "aiofiles"],
            "database": ["sqlalchemy", "redis"],
            "ml": ["tensorflow", "torch", "transformers"],
            "nlp": ["nltk", "spacy"],
            "gui": ["pyautogui", "selenium"]
        }
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from .YAML file."""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {
                "min_confidence": 0.7,
                "max_skills_per_category": 10,
                "update_interval_hours": 24
            }
    
    def scan_codebase(self, root_dir: str = "core") -> Dict[str, Any]:
        """Scan the codebase for skills and capabilities."""
        try:
            skills = {}
            root_path = Path(root_dir)
            
            # Scan Python files
            for py_file in root_path.rglob("*.py"):
                if py_file.name.startswith("test_"):
                    continue
                
                with open(py_file, 'r') as f:
                    try:
                        tree = ast.parse(f.read())
                        file_skills = self._analyze_file(tree, str(py_file))
                        skills.update(file_skills)
                    except Exception as e:
                        self.logger.error(f"Error analyzing {py_file}: {str(e)}")
            
            return skills
        except Exception as e:
            self.logger.error(f"Error scanning codebase: {str(e)}")
            return {}
    
    def _analyze_file(self, tree: ast.AST, file_path: str) -> Dict[str, SkillAnalysis]:
        """Analyze a single file for skills."""
        skills = {}
        
        # Check imports
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                for name in node.names:
                    module = name.name if isinstance(node, ast.Import) else node.module
                    if module:
                        skill = self._identify_skill(module)
                        if skill:
                            skills[skill.name] = skill
        
        # Check function calls and class usage
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Attribute):
                    module = self._get_module_from_attribute(node.func)
                    if module:
                        skill = self._identify_skill(module)
                        if skill:
                            skills[skill.name] = skill
        
        return skills
    
    def _identify_skill(self, module: str) -> Optional[SkillAnalysis]:
        """Identify a skill from .a module name."""
        for category, modules in self.skill_categories.items():
            if any(m in module for m in modules):
                return SkillAnalysis(
                    name=module,
                    category=category,
                    confidence=0.9,
                    dependencies=[],
                    usage_count=1,
                    last_used=datetime.now()
                )
        return None
    
    def _get_module_from_attribute(self, node: ast.Attribute) -> Optional[str]:
        """Get module name from .an attribute node."""
        try:
            if isinstance(node.value, ast.Name):
                return node.value.id
            elif isinstance(node.value, ast.Attribute):
                return self._get_module_from_attribute(node.value)
        except Exception as e:
            self.logger.error(f"Error getting module from .attribute: {str(e)}")
        return None
    
    def save_skills(self, skills: Dict[str, SkillAnalysis]) -> bool:
        """Save analyzed skills to file."""
        try:
            # Convert skills to serializable format
            serializable_skills = {
                name: {
                    "name": skill.name,
                    "category": skill.category,
                    "confidence": skill.confidence,
                    "dependencies": skill.dependencies,
                    "usage_count": skill.usage_count,
                    "last_used": skill.last_used.isoformat() if skill.last_used else None
                }
                for name, skill in skills.items()
            }
            
            # Save to file
            with open(self.skills_file, 'w') as f:
                json.dump(serializable_skills, f, indent=2)
            
            return True
        except Exception as e:
            self.logger.error(f"Error saving skills: {str(e)}")
            return False
    
    def run(self) -> bool:
        """Main execution method for the plugin."""
        try:
            # Scan codebase
            skills = self.scan_codebase()
            
            # Save skills
            if skills:
                return self.save_skills(skills)
            
            return True
        except Exception as e:
            self.logger.error(f"Error in brain self scanner: {str(e)}")
            return False

# Plugin entry point
def run_plugin() -> bool:
    """Entry point for the plugin."""
    scanner = BrainSelfScanner()
    return scanner.run()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = run_plugin()
    print(f"Brain Self Scanner completed {'successfully' if success else 'with errors'}") 