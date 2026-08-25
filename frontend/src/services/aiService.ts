import api from './api';
import { AIChatResponse, AISuggestedQuestion } from '../types';

export const aiService = {
  /**
   * Send a chat prompt to Flowza Agentic AI Assistant.
   */
  sendMessage: async (message: string, conversationId?: string): Promise<AIChatResponse> => {
    const res = await api.post('/api/v1/ai/chat', {
      message,
      conversation_id: conversationId,
    });
    return res.data.data;
  },

  /**
   * Fetch role-tailored prompt recommendations.
   */
  getSuggestedQuestions: async (): Promise<AISuggestedQuestion[]> => {
    const res = await api.get('/api/v1/ai/suggested-questions');
    return res.data.data;
  },

  /**
   * Clear ephemeral session history.
   */
  clearHistory: async (conversationId: string): Promise<void> => {
    await api.delete(`/api/v1/ai/history/${conversationId}`);
  },
};
