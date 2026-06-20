import { api } from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatApi = {
  send: async (message: string, history: ChatMessage[]): Promise<string> => {
    const { data } = await api.post('/chat', { message, history });
    return data.reply;
  },
};
