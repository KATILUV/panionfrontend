import express, { Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';

const router = express.Router();

// Schema for agent registration
const agentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  capabilities: z.array(z.string()).optional().default([])
});

// Schema for team creation
const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional().default(""),
  coordinator_id: z.string().min(1, "Coordinator ID is required")
});

// Schema for message sending
const messageSchema = z.object({
  sender_id: z.string().min(1, "Sender ID is required"),
  receiver_id: z.string().min(1, "Receiver ID is required"),
  message_type: z.string().min(1, "Message type is required"),
  content: z.any(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium")
});

// Schema for knowledge item
const knowledgeSchema = z.object({
  source_agent_id: z.string().min(1, "Source agent ID is required"),
  category: z.string().min(1, "Category is required"),
  content: z.any(),
  tags: z.array(z.string()).optional().default([]),
  confidence: z.number().min(0).max(1).default(1.0)
});

// Get all registered agents
router.get('/agents', async (_req: Request, res: Response) => {
  try {
    // In a real implementation, you'd query the database or API
    // For now, use sample data
    res.json({
      success: true,
      agents: [
        {
          agent_id: "research_agent",
          name: "Research Agent",
          capabilities: ["research", "data_collection", "analysis"],
          registered_at: "2025-05-01T10:00:00Z",
          last_active: "2025-05-08T09:30:00Z"
        },
        {
          agent_id: "planning_agent",
          name: "Planning Agent",
          capabilities: ["planning", "scheduling", "coordination"],
          registered_at: "2025-05-02T14:30:00Z",
          last_active: "2025-05-08T10:15:00Z"
        },
        {
          agent_id: "development_agent",
          name: "Development Agent",
          capabilities: ["coding", "testing", "debugging"],
          registered_at: "2025-05-03T09:45:00Z",
          last_active: "2025-05-08T08:20:00Z"
        },
        {
          agent_id: "creative_agent",
          name: "Creative Agent",
          capabilities: ["design", "content_creation", "ideation"],
          registered_at: "2025-05-04T11:20:00Z",
          last_active: "2025-05-07T16:40:00Z"
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agents"
    });
  }
});

// Register a new agent
router.post('/agents', async (req: Request, res: Response) => {
  try {
    const validation = agentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent data",
        errors: validation.error.errors
      });
    }
    
    const { name, capabilities } = validation.data;
    
    // In a real implementation, you'd save to a database
    // For now, just return success with a generated ID
    
    res.status(201).json({
      success: true,
      agent: {
        agent_id: `agent_${Date.now()}`,
        name,
        capabilities,
        registered_at: new Date().toISOString(),
        last_active: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({
      success: false,
      message: "Failed to register agent"
    });
  }
});

// Get all teams
router.get('/teams', async (_req: Request, res: Response) => {
  try {
    // In a real implementation, you'd query the database or API
    // For now, use sample data
    res.json({
      success: true,
      teams: [
        {
          team_id: "research_team",
          name: "Research Team",
          description: "Team focused on research and data collection",
          coordinator_id: "planning_agent",
          members: [
            {
              agent_id: "research_agent",
              role: "researcher",
              joined_at: "2025-05-05T10:30:00Z"
            },
            {
              agent_id: "development_agent",
              role: "data_analyst",
              joined_at: "2025-05-05T11:15:00Z"
            }
          ],
          active_tasks: [
            {
              task_id: "task_1",
              task_type: "market_research",
              coordinator_id: "planning_agent",
              assigned_at: "2025-05-06T09:00:00Z",
              deadline: "2025-05-10T17:00:00Z",
              assignments: ["research_agent", "development_agent"],
              status: "in_progress"
            }
          ]
        },
        {
          team_id: "development_team",
          name: "Development Team",
          description: "Team focused on development and implementation",
          coordinator_id: "planning_agent",
          members: [
            {
              agent_id: "development_agent",
              role: "lead_developer",
              joined_at: "2025-05-05T14:00:00Z"
            },
            {
              agent_id: "creative_agent",
              role: "ui_designer",
              joined_at: "2025-05-05T14:30:00Z"
            }
          ],
          active_tasks: []
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teams"
    });
  }
});

// Create a new team
router.post('/teams', async (req: Request, res: Response) => {
  try {
    const validation = teamSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid team data",
        errors: validation.error.errors
      });
    }
    
    const { name, description, coordinator_id } = validation.data;
    
    // In a real implementation, you'd save to a database
    // For now, just return success with a generated ID
    
    res.status(201).json({
      success: true,
      team: {
        team_id: `team_${Date.now()}`,
        name,
        description,
        coordinator_id,
        members: [],
        active_tasks: []
      }
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create team"
    });
  }
});

// Add a member to a team
router.post('/teams/:team_id/members', async (req: Request, res: Response) => {
  try {
    const { team_id } = req.params;
    const { agent_id, role } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({
        success: false,
        message: "Agent ID is required"
      });
    }
    
    // In a real implementation, you'd update the team in the database
    // For now, just return success
    
    res.status(200).json({
      success: true,
      member: {
        agent_id,
        role: role || "member",
        joined_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({
      success: false,
      message: "Failed to add team member"
    });
  }
});

// Get messages for an agent
router.get('/messages/:agent_id', async (req: Request, res: Response) => {
  try {
    const { agent_id } = req.params;
    
    // In a real implementation, you'd query the database or API
    // For now, use sample data
    res.json({
      success: true,
      messages: [
        {
          message_id: "msg_1",
          message_type: "task_request",
          sender_id: "planning_agent",
          receiver_id: "research_agent",
          content: {
            text: "Please conduct market research on AI productivity tools. Focus on usage patterns and key features that drive user engagement."
          },
          priority: "high",
          created_at: "2025-05-07T10:30:00Z",
          delivered: true,
          read: true,
          processed: false
        },
        {
          message_id: "msg_2",
          message_type: "knowledge_share",
          sender_id: "research_agent",
          receiver_id: "planning_agent",
          content: {
            text: "I've completed the preliminary analysis of AI tools in the productivity space. Key finding: 78% of users prioritize integration with existing workflows over advanced features."
          },
          priority: "medium",
          created_at: "2025-05-07T14:45:00Z",
          delivered: true,
          read: true,
          processed: true
        },
        {
          message_id: "msg_3",
          message_type: "coordination",
          sender_id: "planning_agent",
          receiver_id: "development_agent",
          content: {
            text: "Based on research findings, we should prioritize API integrations with common productivity tools in the next sprint."
          },
          priority: "medium",
          created_at: "2025-05-07T16:20:00Z",
          delivered: true,
          read: false,
          processed: false
        }
      ].filter(msg => msg.sender_id === agent_id || msg.receiver_id === agent_id)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages"
    });
  }
});

// Send a message
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const validation = messageSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid message data",
        errors: validation.error.errors
      });
    }
    
    const { sender_id, receiver_id, message_type, content, priority } = validation.data;
    
    // In a real implementation, you'd save to a database
    // For now, just return success with a generated ID
    
    res.status(201).json({
      success: true,
      message: {
        message_id: `msg_${Date.now()}`,
        message_type,
        sender_id,
        receiver_id,
        content,
        priority,
        created_at: new Date().toISOString(),
        delivered: false,
        read: false,
        processed: false
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
});

// Get knowledge base items
router.get('/knowledge', async (_req: Request, res: Response) => {
  try {
    // In a real implementation, you'd query the database or API
    // For now, use sample data
    res.json({
      success: true,
      knowledge: [
        {
          item_id: "knowledge_1",
          content: {
            text: "User research indicates that 78% of users prioritize seamless integration with existing workflows over advanced features. This should inform our product development strategy."
          },
          source_agent_id: "research_agent",
          category: "factual",
          confidence: 0.95,
          tags: ["user_research", "product_strategy", "market_insights"],
          created_at: "2025-05-07T15:00:00Z"
        },
        {
          item_id: "knowledge_2",
          content: {
            text: "Common development challenges in AI assistants include maintaining context across sessions, handling ambiguous queries, and managing computational resources effectively."
          },
          source_agent_id: "development_agent",
          category: "technical",
          confidence: 0.9,
          tags: ["development", "challenges", "best_practices"],
          created_at: "2025-05-06T11:30:00Z"
        },
        {
          item_id: "knowledge_3",
          content: {
            text: "Effective team coordination in multi-agent systems requires clear role definition, structured communication protocols, and shared knowledge repositories."
          },
          source_agent_id: "planning_agent",
          category: "procedural",
          confidence: 0.85,
          tags: ["coordination", "team_management", "best_practices"],
          created_at: "2025-05-05T16:45:00Z"
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch knowledge"
    });
  }
});

// Add a knowledge item
router.post('/knowledge', async (req: Request, res: Response) => {
  try {
    const validation = knowledgeSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid knowledge data",
        errors: validation.error.errors
      });
    }
    
    const { source_agent_id, category, content, tags, confidence } = validation.data;
    
    // In a real implementation, you'd save to a database
    // For now, just return success with a generated ID
    
    res.status(201).json({
      success: true,
      knowledge: {
        item_id: `knowledge_${Date.now()}`,
        source_agent_id,
        category,
        content,
        tags,
        confidence,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding knowledge:', error);
    res.status(500).json({
      success: false,
      message: "Failed to add knowledge"
    });
  }
});

// Search knowledge base
router.get('/knowledge/search', async (req: Request, res: Response) => {
  try {
    const { query, category } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }
    
    // In a real implementation, you'd query the database or API
    // For now, just return all knowledge items
    
    // Get all knowledge items
    const allKnowledge = [
      {
        item_id: "knowledge_1",
        content: {
          text: "User research indicates that 78% of users prioritize seamless integration with existing workflows over advanced features. This should inform our product development strategy."
        },
        source_agent_id: "research_agent",
        category: "factual",
        confidence: 0.95,
        tags: ["user_research", "product_strategy", "market_insights"],
        created_at: "2025-05-07T15:00:00Z"
      },
      {
        item_id: "knowledge_2",
        content: {
          text: "Common development challenges in AI assistants include maintaining context across sessions, handling ambiguous queries, and managing computational resources effectively."
        },
        source_agent_id: "development_agent",
        category: "technical",
        confidence: 0.9,
        tags: ["development", "challenges", "best_practices"],
        created_at: "2025-05-06T11:30:00Z"
      },
      {
        item_id: "knowledge_3",
        content: {
          text: "Effective team coordination in multi-agent systems requires clear role definition, structured communication protocols, and shared knowledge repositories."
        },
        source_agent_id: "planning_agent",
        category: "procedural",
        confidence: 0.85,
        tags: ["coordination", "team_management", "best_practices"],
        created_at: "2025-05-05T16:45:00Z"
      }
    ];
    
    // Filter by category if provided
    const filteredByCategory = category 
      ? allKnowledge.filter(item => item.category === category)
      : allKnowledge;
    
    // Simple search by content
    const searchQuery = String(query).toLowerCase();
    const searchResults = filteredByCategory.filter(item => 
      (item.content.text && item.content.text.toLowerCase().includes(searchQuery)) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery))
    );
    
    res.json({
      success: true,
      results: searchResults,
      count: searchResults.length
    });
  } catch (error) {
    console.error('Error searching knowledge:', error);
    res.status(500).json({
      success: false,
      message: "Failed to search knowledge"
    });
  }
});

// Get tasks for a team
router.get('/teams/:team_id/tasks', async (req: Request, res: Response) => {
  try {
    const { team_id } = req.params;
    
    // For now, return sample tasks
    res.json({
      success: true,
      tasks: [
        {
          task_id: "task_1",
          task_type: "market_research",
          coordinator_id: "planning_agent",
          assigned_at: "2025-05-06T09:00:00Z",
          deadline: "2025-05-10T17:00:00Z",
          assignments: ["research_agent", "development_agent"],
          status: "in_progress"
        }
      ]
    });
  } catch (error) {
    console.error('Error fetching team tasks:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team tasks"
    });
  }
});

// Create a task for a team
router.post('/teams/:team_id/tasks', async (req: Request, res: Response) => {
  try {
    const { team_id } = req.params;
    const { task_type, coordinator_id, deadline, assignments } = req.body;
    
    if (!task_type || !coordinator_id) {
      return res.status(400).json({
        success: false,
        message: "Task type and coordinator ID are required"
      });
    }
    
    // In a real implementation, you'd save to a database
    
    res.status(201).json({
      success: true,
      task: {
        task_id: `task_${Date.now()}`,
        task_type,
        coordinator_id,
        assigned_at: new Date().toISOString(),
        deadline: deadline || null,
        assignments: assignments || [],
        status: "pending"
      }
    });
  } catch (error) {
    console.error('Error creating team task:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create team task"
    });
  }
});

export default router;