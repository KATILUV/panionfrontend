/**
 * User Preferences Routes
 * Endpoints for managing user preferences and personalization settings
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { userPreferences, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getUserPreferences, updateUserPreferences } from '../enhanced-memory';
import { z } from 'zod';

const router = Router();

// Get user preferences
router.get('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user exists
    const [userExists] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const preferences = await getUserPreferences(userId);
    res.status(200).json({ preferences });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update user preferences schema
const updatePreferencesSchema = z.object({
  preferredMode: z.string().optional(),
  theme: z.string().optional(),
  fontSize: z.string().optional(),
  personalityTraits: z.array(z.string()).optional(),
  enableNotifications: z.boolean().optional(),
  showThinkingProcess: z.boolean().optional(),
  agentReactiveness: z.string().optional(),
  responseLength: z.string().optional(),
  detailLevel: z.string().optional(),
  multiAgentAnalysisEnabled: z.boolean().optional(),
  memoryUtilizationLevel: z.string().optional(),
  customSettings: z.record(z.any()).optional(),
});

// Update user preferences
router.patch('/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate request body
    const validationResult = updatePreferencesSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid preference data',
        details: validationResult.error.format()
      });
    }
    
    // Check if user exists
    const [userExists] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update preferences
    const updatedPreferences = await updateUserPreferences(userId, validationResult.data);
    
    res.status(200).json({ 
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      error: 'Failed to update user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get default preferences (without requiring a user account)
router.get('/preferences/default', async (_req: Request, res: Response) => {
  try {
    // Return default preferences structure
    res.status(200).json({
      preferences: {
        preferredMode: "casual",
        theme: "system",
        fontSize: "medium",
        personalityTraits: ["analytical", "curious", "empathetic"],
        enableNotifications: true,
        showThinkingProcess: true,
        agentReactiveness: "balanced",
        responseLength: "balanced",
        detailLevel: "balanced",
        multiAgentAnalysisEnabled: true,
        memoryUtilizationLevel: "medium",
        customSettings: {}
      }
    });
  } catch (error) {
    console.error('Error fetching default preferences:', error);
    res.status(500).json({
      error: 'Failed to fetch default preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;