import axios from 'axios';

interface LlamaMessage {
  role: string;
  content: string;
}

interface LlamaGroqChatOptions {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export class LlamaGroqChat {
  private apiKey: string;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL: string = 'https://api.groq.com/openai/v1';

  constructor(options: LlamaGroqChatOptions = {}) {
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY || '';
    this.modelName = options.modelName || 'llama-3.1-405b-reasoning';
    this.temperature = options.temperature ?? 0.1;
    this.maxTokens = options.maxTokens ?? 4000;

    if (!this.apiKey) {
      console.warn('Groq API key not provided. Llama model will be skipped.');
    }
  }

  async invoke(messages: LlamaMessage[]): Promise<{ content: string }> {
    if (!this.apiKey) {
      return { content: '// Groq API key not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.modelName,
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
        console.error('Groq API error:', error.response?.data || error.message);
      } else {
        console.error('Groq invocation error:', error);
      }
      throw new Error('Llama generation failed');
    }
  }
}