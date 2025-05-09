import express, { Request, Response, Router } from 'express';
import { log } from '../vite';
import { getStrategicPlan } from '../strategic-planner';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

/**
 * Strategic analysis endpoint
 * Performs multi-perspective analysis to help solve complex problems
 */
router.post('/api/strategic/analyze', async (req: Request, res: Response) => {
  try {
    const { goal, parameters = {} } = req.body;
    
    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Goal description is required'
      });
    }
    
    // Default parameters
    const sessionId = parameters.sessionId || `session_${Date.now()}`;
    const compareStrategies = parameters.compare_strategies !== false;
    const useReflection = parameters.use_reflection !== false;
    const maxAttempts = parameters.max_attempts || 3;
    
    log(`Strategic analysis for: "${goal}"`, 'strategic-analysis');
    
    // Generate a plan using the strategic planner
    const plan = await getStrategicPlan(goal, [], []);
    
    // Initialize strategies analysis
    const strategies = [];
    let responseMessage = "";
    let thinking = "";
    
    // First approach: Direct response
    try {
      const directResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a strategic analyst. Provide a thoughtful, insightful analysis of the user's question or request. 
            Focus on giving practical, actionable insights based on established knowledge.`
          },
          { role: "user", content: goal }
        ],
        temperature: 0.7
      });
      
      strategies.push({
        name: "Direct Analysis",
        approach: "Providing a direct, expert response",
        content: directResponse.choices[0].message.content,
        success: true,
        reasoning: "This approach provides a straightforward expert analysis."
      });
      
      thinking += "## Direct Analysis Approach\n";
      thinking += "Provided a direct expert response to the query without additional structuring.\n\n";
    } catch (error) {
      log(`Error in direct analysis approach: ${error}`, 'strategic-analysis');
      strategies.push({
        name: "Direct Analysis",
        approach: "Providing a direct, expert response",
        success: false,
        reasoning: `Failed due to: ${error}`
      });
    }
    
    // Second approach: Step-by-step breakdown
    try {
      const stepByStepResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a strategic analyst. Break down the user's question or request into clear, logical steps.
            For each step, provide rationale and specific actions that should be taken. Your analysis should be
            structured, methodical, and focused on practical implementation.`
          },
          { role: "user", content: goal }
        ],
        temperature: 0.7
      });
      
      strategies.push({
        name: "Step-by-Step Breakdown",
        approach: "Breaking down the problem into logical components",
        content: stepByStepResponse.choices[0].message.content,
        success: true,
        reasoning: "This approach provides a methodical breakdown of the problem and solution steps."
      });
      
      thinking += "## Step-by-Step Breakdown Approach\n";
      thinking += "Analyzed the problem by breaking it down into logical components and steps.\n\n";
    } catch (error) {
      log(`Error in step-by-step approach: ${error}`, 'strategic-analysis');
      strategies.push({
        name: "Step-by-Step Breakdown",
        approach: "Breaking down the problem into logical components",
        success: false,
        reasoning: `Failed due to: ${error}`
      });
    }
    
    // Third approach: Multi-perspective analysis (if enabled)
    if (compareStrategies) {
      try {
        const perspectiveResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a strategic analyst capable of considering multiple perspectives. 
              Analyze the user's question from at least three different viewpoints or approaches.
              Compare and contrast these perspectives, highlighting the strengths and weaknesses of each.
              Conclude with a recommendation that synthesizes the best elements of each perspective.`
            },
            { role: "user", content: goal }
          ],
          temperature: 0.7
        });
        
        strategies.push({
          name: "Multi-Perspective Analysis",
          approach: "Examining the problem from multiple viewpoints",
          content: perspectiveResponse.choices[0].message.content,
          success: true,
          reasoning: "This approach considers diverse perspectives to form a more complete understanding."
        });
        
        thinking += "## Multi-Perspective Analysis Approach\n";
        thinking += "Examined the problem from multiple viewpoints to gain comprehensive insights.\n\n";
      } catch (error) {
        log(`Error in multi-perspective approach: ${error}`, 'strategic-analysis');
        strategies.push({
          name: "Multi-Perspective Analysis",
          approach: "Examining the problem from multiple viewpoints",
          success: false,
          reasoning: `Failed due to: ${error}`
        });
      }
    }
    
    // Choose the best strategy based on available data
    const successfulStrategies = strategies.filter(s => s.success);
    
    if (successfulStrategies.length === 0) {
      // All strategies failed, provide a generic response
      responseMessage = "I apologize, but I encountered difficulties analyzing this request. Please try rephrasing your question or providing more details.";
    } else {
      // Integrate successful strategies into a comprehensive response
      try {
        const strategiesText = successfulStrategies
          .map(s => `Strategy: ${s.name}\nApproach: ${s.approach}\nAnalysis: ${s.content || "No content available"}\n`)
          .join("\n---\n\n");
        
        const integrationResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert at synthesizing multiple analyses into a cohesive, insightful response. 
              Review the different strategic analyses provided and create a comprehensive response that 
              incorporates the strengths of each approach.`
            },
            { 
              role: "user", 
              content: `Original question: ${goal}\n\nHere are different strategic analyses of this question:\n\n${strategiesText}\n\nPlease synthesize these into a comprehensive, cohesive response that addresses the original question.` 
            }
          ],
          temperature: 0.7
        });
        
        responseMessage = integrationResponse.choices[0].message.content || successfulStrategies[0].content || "";
        
        thinking += "## Integration Phase\n";
        thinking += "Successfully synthesized insights from multiple strategic approaches into a comprehensive response.\n\n";
      } catch (error) {
        log(`Error in strategy integration: ${error}`, 'strategic-analysis');
        // Fallback to the first successful strategy
        responseMessage = (successfulStrategies[0]?.content || "I've analyzed your request but encountered difficulties synthesizing a response. Here's my direct analysis: " + plan.planDescription);
      }
    }
    
    // Add self-reflection if enabled
    if (useReflection && responseMessage) {
      try {
        const reflectionResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a reflective analyst. Review the given strategic analysis and assess its strengths, 
              weaknesses, and potential blind spots. Your goal is to identify how the analysis could be improved 
              and what important aspects might have been overlooked.`
            },
            { 
              role: "user", 
              content: `Original question: ${goal}\n\nStrategic analysis: ${responseMessage}\n\nPlease provide a brief critical reflection on this analysis.` 
            }
          ],
          temperature: 0.7
        });
        
        thinking += "## Self-Reflection\n";
        thinking += reflectionResponse.choices[0].message.content || "No reflection available.";
      } catch (error) {
        log(`Error in self-reflection: ${error}`, 'strategic-analysis');
        thinking += "## Self-Reflection\n";
        thinking += "Attempted to perform self-reflection but encountered an error.";
      }
    }
    
    // Add structure to thinking
    thinking = `# Strategic Analysis for: "${goal}"\n\n` + 
      `## Strategic Plan\n${JSON.stringify(plan, null, 2)}\n\n` + 
      thinking;
    
    // Return the final response
    return res.json({
      response: responseMessage,
      thinking,
      plan,
      strategies: strategies.map(s => ({
        name: s.name,
        approach: s.approach,
        success: s.success,
        reasoning: s.reasoning
      })),
      success: true
    });
    
  } catch (error) {
    log(`Error in strategic analysis: ${error}`, 'strategic-analysis');
    res.status(500).json({
      error: 'Failed to perform strategic analysis',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;