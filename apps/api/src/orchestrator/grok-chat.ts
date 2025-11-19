import axios from 'axios';

interface GrokMessage {
  role: string;
  content: string;
}

interface GrokChatOptions {
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export class GrokChat {
  private apiKey: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL: string = 'https://api.x.ai/v1';

  constructor(options: GrokChatOptions = {}) {
    this.apiKey = options.apiKey || process.env.XAI_API_KEY || '';
    this.temperature = options.temperature ?? 0.2;
    this.maxTokens = options.maxTokens ?? 4000;

    if (!this.apiKey) {
      console.warn('Grok API key not provided. Grok model will be skipped.');
    }
  }

  async invoke(messages: GrokMessage[]): Promise<{ content: string }> {
    if (!this.apiKey) {
      return { content: '// Grok API key not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'grok-2-1212',
          messages: messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      return {
        content: response.data.choices[0].message.content || ''
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Grok API error:', error.response?.data || error.message);
      } else {
        console.error('Grok invocation error:', error);
      }
      throw new Error('Grok generation failed');
    }
  }
}