"""
Run Complex Goal Script
Executes a complex multi-stage research and analysis project.
"""

import asyncio
import logging
from pathlib import Path
import json
from core.orchestrator import orchestrator
from config.logging_config import setup_logging

# Set up logging
setup_logging()
logger = logging.getLogger("panion")

async def main():
    """Main execution function."""
    try:
        # Initialize system
        logger.info("Initializing Panion system...")
        config = {
            "resources": {
                "memory": {
                    "max_usage": 8192,
                    "pool_size": 4096
                },
                "cpu": {
                    "max_threads": 4,
                    "pool_size": 2
                }
            },
            "plugins": {
                "http_request": {
                    "max_retries": 3,
                    "timeout": 30
                },
                "content_extraction": {
                    "supported_formats": ["json", "html", "text"]
                },
                "text_analysis": {
                    "language": "en",
                    "models": ["sentiment", "topic"]
                }
            },
            "team_formation": {
                "data_dir": "data/teams",
                "roles": {
                    "researcher": {
                        "required_capabilities": ["web_search", "data_collection"],
                        "min_skill_level": 0.8
                    },
                    "analyst": {
                        "required_capabilities": ["data_analysis", "pattern_recognition"],
                        "min_skill_level": 0.7
                    },
                    "synthesizer": {
                        "required_capabilities": ["content_synthesis", "writing"],
                        "min_skill_level": 0.6
                    }
                },
                "skill_requirements": {
                    "research": 0.8,
                    "analysis": 0.7,
                    "writing": 0.6,
                    "technical": 0.5
                }
            }
        }
        
        if not await orchestrator.initialize(config):
            logger.error("Failed to initialize system")
            return
            
        # Create test agents
        logger.info("Creating test agents...")
        agents = [
            {
                "name": "Alice",
                "skills": {
                    "research": 0.9,
                    "analysis": 0.8,
                    "writing": 0.7,
                    "technical": 0.6
                },
                "capabilities": ["web_search", "data_collection", "data_analysis"]
            },
            {
                "name": "Bob",
                "skills": {
                    "research": 0.7,
                    "analysis": 0.9,
                    "writing": 0.6,
                    "technical": 0.8
                },
                "capabilities": ["data_analysis", "pattern_recognition", "content_synthesis"]
            },
            {
                "name": "Charlie",
                "skills": {
                    "research": 0.6,
                    "analysis": 0.7,
                    "writing": 0.9,
                    "technical": 0.5
                },
                "capabilities": ["content_synthesis", "writing", "data_collection"]
            }
        ]
        
        for agent_data in agents:
            agent_id = await orchestrator.team_manager.create_agent(
                name=agent_data["name"],
                skills=agent_data["skills"],
                capabilities=agent_data["capabilities"]
            )
            if agent_id:
                logger.info(f"Created agent: {agent_data['name']} (ID: {agent_id})")
            else:
                logger.error(f"Failed to create agent: {agent_data['name']}")
        
        # Define complex goal
        complex_goal = {
            "name": "Multi-Stage Research and Analysis Project",
            "description": "Research, analyze, and synthesize information from multiple sources",
            "team_requirements": {
                "min_team_size": 3,
                "max_team_size": 5,
                "required_skills": {
                    "research": 0.8,
                    "analysis": 0.7,
                    "writing": 0.6,
                    "technical": 0.5
                }
            },
            "role_requirements": {
                "researcher": {
                    "required_capabilities": ["web_search", "data_collection"],
                    "min_skill_level": 0.8
                },
                "analyst": {
                    "required_capabilities": ["data_analysis", "pattern_recognition"],
                    "min_skill_level": 0.7
                },
                "synthesizer": {
                    "required_capabilities": ["content_synthesis", "writing"],
                    "min_skill_level": 0.6
                }
            },
            "subtasks": [
                {
                    "name": "Initial Research",
                    "plugin_id": "http_request",
                    "required_resources": {
                        "memory": 512,
                        "cpu": 1
                    },
                    "config": {
                        "urls": ["https://api.example.com/research"],
                        "method": "GET",
                        "timeout": 30
                    }
                },
                {
                    "name": "Content Extraction",
                    "plugin_id": "content_extraction",
                    "required_resources": {
                        "memory": 1024,
                        "cpu": 2
                    },
                    "config": {
                        "format": "json",
                        "extract_fields": ["title", "content", "metadata"]
                    }
                },
                {
                    "name": "Text Analysis",
                    "plugin_id": "text_analysis",
                    "required_resources": {
                        "memory": 2048,
                        "cpu": 2
                    },
                    "config": {
                        "analysis_type": "sentiment",
                        "language": "en"
                    }
                }
            ],
            "dependencies": {
                "Content Extraction": ["Initial Research"],
                "Text Analysis": ["Content Extraction"]
            },
            "success_criteria": {
                "completion_time": 3600,  # 1 hour
                "quality_threshold": 0.8,
                "required_outputs": [
                    "research_summary",
                    "analysis_report",
                    "synthesis_document"
                ]
            },
            "error_handling": {
                "retry_attempts": 3,
                "fallback_strategies": {
                    "http_request": "use_cached_data",
                    "content_extraction": "manual_extraction",
                    "text_analysis": "basic_analysis"
                }
            }
        }
        
        # Process goal
        logger.info("Processing complex goal...")
        success = await orchestrator.process_goal(complex_goal)
        
        if success:
            logger.info("Goal completed successfully!")
            
            # Get team analytics
            if 'team_context' in complex_goal:
                team_id = complex_goal['team_context']['team_id']
                analytics = await orchestrator.team_manager.get_team_analytics(team_id)
                logger.info(f"Team Analytics: {json.dumps(analytics, indent=2)}")
                
                # Get system analytics
                system_analytics = await orchestrator.team_manager.get_system_analytics()
                logger.info(f"System Analytics: {json.dumps(system_analytics, indent=2)}")
        else:
            logger.error("Goal failed to complete")
            
    except Exception as e:
        logger.error(f"Error running complex goal: {e}")
    finally:
        # Cleanup
        await orchestrator.cleanup()

if __name__ == "__main__":
    asyncio.run(main()) 