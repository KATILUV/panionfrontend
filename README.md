# Panion AI Desktop Environment

## Overview
Panion is an advanced AI companion desktop environment that provides a flexible, multi-agent interaction platform with sophisticated search, data exploration, and context understanding capabilities.

## Key Components
- **Multi-agent AI interaction platform**: Orchestrates multiple specialized AI agents
- **Intelligent location and context-aware search**: Finds relevant information based on user context
- **Advanced data visualization and exploration tools**: Visualizes complex data relationships
- **Adaptive user preference learning**: Remembers and adapts to user preferences
- **Enhanced information extraction**: Extracts structured data from various sources

## Technologies
- **Frontend**: React with TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Express.js server with RESTful API
- **AI Models**: Integrates with OpenAI (GPT-4o) and Anthropic (Claude) models
- **Data Visualization**: D3.js for interactive data visualizations
- **Python Services**: Python-based data processing and agent coordination

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- Python 3.10+ (for backend services)

### Installation
1. Clone this repository
2. Install Node.js dependencies:
   ```
   npm install
   ```
3. Install Python dependencies:
   ```
   cd panion
   pip install -r requirements.txt
   ```

### Environment Setup
Set up the following environment variables:
- `OPENAI_API_KEY`: For OpenAI integration
- `ANTHROPIC_API_KEY`: For Claude integration (recommended for best results)

### Running the Application
```
npm run dev
```

This will start both the Express server and the React frontend.

## System Architecture

### Client
The client is built with React and provides an interactive desktop-like environment for agent interaction.

### Server
The server handles:
- API requests to AI services
- Memory management
- Agent coordination
- Task orchestration

### Panion Core
The Python-based core system provides:
- Advanced agent collaboration
- Team formation for complex tasks
- Plugin synthesis capabilities
- Enhanced task scheduling

## Project Structure
- `/client`: React frontend and UI components
- `/server`: Express.js backend
- `/panion`: Python core system
- `/shared`: Shared types and schemas
- `/data`: Data storage
- `/clara_memory`: User memory and conversation storage
- `/attached_assets`: Design documents and reference materials
- `/uploads`: User uploaded files

## Features
- **Chat interface**: Natural language interaction with all agents
- **Autonomous operation**: Continues work without user presence
- **Team-based problem solving**: Forms agent teams for complex problems
- **Dynamic agent creation**: Synthesizes new specialized agents on demand
- **Strategic multi-step planning**: Breaks down complex tasks
- **Visual knowledge exploration**: Interactive data visualization
- **Memory system**: Remembers past interactions and user preferences

## Development Notes

### Reference Materials
The `/attached_assets` directory contains various reference materials and design documents used during development, including:
- Feature specifications
- Design mockups
- Error logs
- Requirements documents

These files serve as documentation for the development process and can be used for reference when understanding design decisions.