import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message } from '@shared/schema';

/**
 * Hook for managing conversation history
 */
export function useConversationHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
      } else {
        throw new Error(data.message || 'Failed to fetch conversations');
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch a specific conversation
  const fetchConversation = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/conversations/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentSession(sessionId);
        setCurrentMessages(data.messages);
      } else {
        throw new Error(data.message || 'Failed to fetch conversation');
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear a conversation
  const clearConversation = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/conversations/${sessionId}/clear`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear conversation: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        if (sessionId === currentSession) {
          setCurrentMessages([]);
        }
        
        // Refresh conversations list
        fetchConversations();
      } else {
        throw new Error(data.message || 'Failed to clear conversation');
      }
    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, fetchConversations]);

  // Rename a conversation
  const renameConversation = useCallback(async (sessionId: string, title: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/conversations/${sessionId}/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to rename conversation: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update conversations list
        setConversations(prevConversations => 
          prevConversations.map(conversation => 
            conversation.sessionId === sessionId 
              ? { ...conversation, title } 
              : conversation
          )
        );
      } else {
        throw new Error(data.message || 'Failed to rename conversation');
      }
    } catch (err) {
      console.error('Error renaming conversation:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    currentSession,
    currentMessages,
    isLoading,
    error,
    fetchConversations,
    fetchConversation,
    clearConversation,
    renameConversation
  };
}