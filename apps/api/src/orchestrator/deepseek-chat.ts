import axios from 'axios';

interface DeepSeekMessage {
  role: string;
  content: string;
}

interface DeepSeekChatOptions {
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export class DeepSeekChat {
  private apiKey: string;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;
  private baseURL: string = 'https://api.deepseek.com/v1';

  constructor(options: DeepSeekChatOptions = {}) {
    this.apiKey = options.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.modelName = options.modelName || 'deepseek-coder';
    this.temperature = options.temperature ?? 0.1;
    this.maxTokens = options.maxTokens ?? 4000;

    if (!this.apiKey) {
      console.warn('DeepSeek API key not provided. DeepSeek model will be skipped.');
    }
  }

  async invoke(messages: DeepSeekMessage[]): Promise<{ content: string }> {
    if (!this.apiKey) {
      return { content: '// DeepSeek API key not configured' };
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
        console.error('DeepSeek API error:', error.response?.data || error.message);
      } else {
        console.error('DeepSeek invocation error:', error);
      }
      throw new Error('DeepSeek generation failed');
    }
  }
}