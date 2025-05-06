# Clara AI Assistant Architecture

## Overview

Clara AI Assistant is a web application built with React, TypeScript, and Node.js that provides an AI companion powered by OpenAI's GPT-4o model. The application features a visually stunning interface centered around an animated orb, natural language conversations, image analysis, and a memory system that allows Clara to remember important details from conversations.

The application follows a client-server architecture, with a React frontend and an Express.js backend. It uses modern web technologies and follows established patterns for state management, API integration, and UI design.

## System Architecture

The system is structured as a monorepo with client and server directories, sharing common types and utilities. The architecture follows these key principles:

1. **Separation of Concerns**: Clear separation between frontend (client) and backend (server) code
2. **Component-Based UI**: Modular React components organized by functionality
3. **Global State Management**: Zustand for centralized state management
4. **API Integration**: RESTful API endpoints for communication between client and server
5. **Memory Persistence**: File-based and database storage for Clara's memory system

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Frontend │ ◄─────► │  Express Server │ ◄─────► │   OpenAI API    │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     ▲
                                     │
                                     ▼
                            ┌─────────────────┐
                            │                 │
                            │  File Storage   │
                            │  & Database     │
                            │                 │
                            └─────────────────┘
```

## Key Components

### Frontend Architecture

The frontend is built with React, TypeScript, and Tailwind CSS, with the following structure:

1. **Pages**: Main application views (desktop-page, landing-page, auth-page, marketplace-page)
2. **Components**: 
   - UI components (shadcn/ui library components)
   - Application-specific components (ClaraOrb, ChatBubble, ChatInput, etc.)
   - Agent components that provide specific functionality
3. **State Management**: 
   - Zustand stores for global state (agentStore, themeStore, systemLogStore, etc.)
   - React hooks for local state and component logic
4. **Hooks and Utilities**: 
   - Custom hooks (useChat, useToast, useMobile)
   - Utility functions for common operations

### Backend Architecture

The backend is built with Express.js and Node.js, structured as follows:

1. **API Routes**: Endpoints for chat, memory management, file uploads
2. **Services**:
   - OpenAI integration for AI capabilities
   - Memory management for storing and retrieving conversations
   - File storage and cleanup utilities
3. **Database**: PostgreSQL with Drizzle ORM for structured data storage
4. **Middleware**: Request handling, error handling, CORS configuration

### Memory System

Clara's memory system is a key architectural component that allows the AI to remember conversations and important details:

1. **Short-term Memory**: Recent conversation history stored in-memory during sessions
2. **Long-term Memory**: Important facts and details stored persistently in:
   - File-based storage (memories.json)
   - Database tables (messages table)
3. **Memory Retrieval**: Semantic search to find relevant memories for context during conversations

### Database Schema

The application uses Drizzle ORM with a PostgreSQL database, with the following schema:

1. **Users Table**: Stores user credentials and information
   - id (primary key)
   - username (unique)
   - password

2. **Messages Table**: Stores chat messages and conversation history
   - id (primary key)
   - content
   - isUser (boolean)
   - timestamp
   - sessionId
   - important (boolean)

## Data Flow

### Chat Interaction Flow

1. User sends a message through the frontend chat interface
2. Frontend makes a POST request to the `/api/chat` endpoint with the message content
3. Backend processes the request:
   - Retrieves conversation history
   - Fetches relevant memories
   - Constructs a prompt for OpenAI
   - Sends the request to the OpenAI API
4. OpenAI returns a response
5. Backend processes the response:
   - Analyzes it for important information to store in memory
   - Sends the response back to the frontend
6. Frontend displays the response to the user
7. Important details are stored in the memory system for future reference

### Image Analysis Flow

1. User uploads an image through the frontend
2. Frontend sends the image to the backend
3. Backend processes the image:
   - Stores it in the uploads directory
   - Sends it to OpenAI for analysis
4. OpenAI returns a description/analysis of the image
5. Backend sends the analysis back to the frontend
6. Frontend displays the analysis to the user

## External Dependencies

The application relies on several external services and libraries:

1. **OpenAI API**: Core AI capabilities for natural language processing and image analysis
2. **Anthropic API**: Alternative AI model option
3. **PostgreSQL**: Database for structured data storage
4. **shadcn/ui**: UI component library based on Radix UI primitives
5. **Tailwind CSS**: Utility-first CSS framework for styling
6. **Zustand**: State management library
7. **Stripe**: Payment processing integration (partially implemented)

## Deployment Strategy

The application is configured for deployment on Replit, with specific configurations for development and production environments:

1. **Development Mode**:
   - Uses Vite's development server with HMR
   - Environment variables loaded from .env file
   - File-based storage for quick iteration

2. **Production Mode**:
   - Build process using Vite for frontend and esbuild for backend
   - Static assets served by Express
   - Database connections pooled for efficiency
   - Environment variables set in deployment platform

3. **Build Pipeline**:
   - Frontend: Vite builds static assets to dist/public
   - Backend: esbuild bundles server code to dist
   - Combined into a single deployable package

The deployment strategy ensures efficient resource usage while maintaining a good development experience.