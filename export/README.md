# Clara AI Companion

## Overview
Clara is an AI companion with a beautiful interface, advanced memory capabilities, and support for text and image interactions.

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- An OpenAI API key (or Anthropic API key if using Claude)

### Installation
1. Extract this ZIP archive
2. Run `npm install` to install dependencies
3. Create a `.env` file with your API keys (see .env.example)
4. Run `npm run build` to build the application
5. Run `npm start` to start the application

### Environment Variables
Create a .env file with:
```
OPENAI_API_KEY=your_openai_key_here
# Optional: ANTHROPIC_API_KEY=your_anthropic_key_here
PORT=5000 # Optional: defaults to 5000
```

## Features
- Text conversations with memory
- Image analysis capabilities
- Beautiful orb interface with animations
- Responsive design for all devices

## Technology
- React + TypeScript frontend
- Express backend
- OpenAI GPT-4o integration
- Custom memory system

## License
This package is for personal use only.
