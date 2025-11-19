import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage } from "@langchain/core/messages";
import { GrokChat } from "./grok-chat";
import { DeepSeekChat } from "./deepseek-chat";
import { LlamaGroqChat } from "./llama-groq-chat";

export interface AgentState {
  prompt: string;
  codeSubmissions: {
    model: string;
    code: string;
    reasoning: string;
    score?: number;
    executionTime?: number;
  }[];
  bestCode?: string;
  bestModel?: string;
  bestScore?: number;
}

export class MultiLLMOrchestrator {
  private openai?: ChatOpenAI;
  private anthropic?: ChatAnthropic;
  private grok?: GrokChat;
  private llama?: LlamaGroqChat;
  private deepseek?: DeepSeekChat;
  private gemini?: ChatGoogleGenerativeAI;
  private mistral?: ChatMistralAI;
  private evaluator: ChatOpenAI;
  private availableModels: string[] = [];

  constructor() {
    // Initialize only models with valid API keys
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your')) {
      this.openai = new ChatOpenAI({
        modelName: "gpt-4o",
        temperature: 0.1,
        maxTokens: 4000,
      });
      this.availableModels.push('openai');
      console.log("✓ OpenAI GPT-4o initialized");
    }

    if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('your')) {
      this.anthropic = new ChatAnthropic({
        modelName: "claude-3-5-sonnet-20241022",
        temperature: 0.1,
        maxTokens: 4000,
      });
      this.availableModels.push('claude');
      console.log("✓ Claude 3.5 Sonnet initialized");
    }

    if (process.env.XAI_API_KEY && !process.env.XAI_API_KEY.includes('your')) {
      this.grok = new GrokChat({
        temperature: 0.2,
        maxTokens: 4000,
      });
      this.availableModels.push('grok');
      console.log("✓ Grok initialized");
    }

    if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your')) {
      this.llama = new LlamaGroqChat({
        modelName: "llama-3.1-405b-reasoning",
        temperature: 0.1,
        maxTokens: 4000,
      });
      this.availableModels.push('llama');
      console.log("✓ Llama-3.1-405B initialized");
    }

    if (process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.includes('your')) {
      this.deepseek = new DeepSeekChat({
        modelName: "deepseek-coder",
        temperature: 0.1,
        maxTokens: 4000,
      });
      this.availableModels.push('deepseek');
      console.log("✓ DeepSeek-Coder initialized");
    }

    if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes('your')) {
      this.gemini = new ChatGoogleGenerativeAI({
        modelName: "gemini-1.5-pro",
        temperature: 0.1,
        maxOutputTokens: 4000,
      });
      this.availableModels.push('gemini');
      console.log("✓ Gemini-1.5-Pro initialized");
    }

    if (process.env.MISTRAL_API_KEY && !process.env.MISTRAL_API_KEY.includes('your')) {
      this.mistral = new ChatMistralAI({
        modelName: "mistral-large-2407",
        temperature: 0.1,
        maxTokens: 4000,
      });
      this.availableModels.push('mistral');
      console.log("✓ Mistral-Large-2 initialized");
    }

    // Evaluator uses OpenAI (required)
    if (!this.openai) {
      throw new Error("OpenAI API key is required for the evaluator. Please set OPENAI_API_KEY in .env");
    }
    this.evaluator = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.1,
      maxTokens: 2000,
    });

    console.log(`📊 Available models: ${this.availableModels.length} (${this.availableModels.join(', ')})`);
  }

  private buildPrompt(userPrompt: string, requirements: string[], framework: string, model: string): string {
    return `
Build a complete, production-ready solution for: "${userPrompt}"

Requirements: ${requirements.join(', ')}
Framework: ${framework || 'React'}

Generate clean, modern code with:
- Responsive design
- Proper TypeScript types
- Best practices and optimization
- Beautiful UI with modern CSS
- Complete functionality

${model === 'claude' ? 'Focus on exceptional UI/UX design and component structure.' : ''}
${model === 'grok' ? 'Be creative and think outside the box for innovative solutions.' : ''}
${model === 'llama' ? 'Emphasize robust architecture and efficient algorithms.' : ''}
${model === 'deepseek' ? 'Generate clean, optimized code with excellent performance.' : ''}
${model === 'gemini' ? 'Focus on complex logic and seamless user interactions.' : ''}
${model === 'mistral' ? 'Provide a well-balanced solution covering all aspects.' : ''}
${model === 'openai' ? 'Optimize for clarity, reliability and best practices.' : ''}

Return only the complete code ready for deployment.
`;
  }

  public async generate(prompt: string): Promise<{
    code: string;
    model: string;
    score: number;
    models: string[];
    executionDetails: any;
  }> {
    console.log(`Starting code generation with ${this.availableModels.length} models...`);

    // Step 1: Analyze requirements
    const analysisPrompt = `
Analyze this request and determine requirements:
"${prompt}"

Identify:
1. Framework needed (React, Next.js, Vue, etc.)
2. Key features required
3. UI/UX complexity level

Respond in JSON format only:
{
  "framework": "react",
  "requirements": ["responsive design", "modern UI"],
  "complexity": "medium"
}
`;

    let framework = "react";
    let requirements: string[] = ["basic functionality"];

    try {
      const analysis = await this.evaluator.invoke([new HumanMessage(analysisPrompt)]);
      const parsed = JSON.parse(analysis.content as string);
      framework = parsed.framework || "react";
      requirements = parsed.requirements || ["basic functionality"];
    } catch (error) {
      console.error("Analysis failed, using defaults:", error);
    }

    console.log(`Framework: ${framework}, Requirements: ${requirements.join(', ')}`);

    // Step 2: Generate code with all available models in parallel
    const submissions: {
      model: string;
      code: string;
      reasoning: string;
      executionTime: number;
    }[] = [];

    const generatePromises: Promise<void>[] = [];

    if (this.openai && this.availableModels.includes('openai')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with OpenAI GPT-4o...");
            const start = Date.now();
            const response = await this.openai!.invoke([
              new HumanMessage(this.buildPrompt(prompt, requirements, framework, "openai"))
            ]);
            submissions.push({
              model: "OpenAI GPT-4o",
              code: response.content as string,
              reasoning: "Optimized for speed and reliability",
              executionTime: Date.now() - start,
            });
            console.log(`✓ OpenAI completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ OpenAI generation failed:", error);
          }
        })()
      );
    }

    if (this.anthropic && this.availableModels.includes('claude')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with Claude 3.5 Sonnet...");
            const start = Date.now();
            const response = await this.anthropic!.invoke([
              new HumanMessage(this.buildPrompt(prompt, requirements, framework, "claude"))
            ]);
            submissions.push({
              model: "Claude 3.5 Sonnet",
              code: response.content as string,
              reasoning: "Excellent UI/UX design and code structure",
              executionTime: Date.now() - start,
            });
            console.log(`✓ Claude completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ Claude generation failed:", error);
          }
        })()
      );
    }

    if (this.grok && this.availableModels.includes('grok')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with Grok...");
            const start = Date.now();
            const response = await this.grok!.invoke([
              { role: "user", content: this.buildPrompt(prompt, requirements, framework, "grok") }
            ]);
            submissions.push({
              model: "Grok",
              code: response.content as string,
              reasoning: "Creative problem-solving and reasoning",
              executionTime: Date.now() - start,
            });
            console.log(`✓ Grok completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ Grok generation failed:", error);
          }
        })()
      );
    }

    if (this.llama && this.availableModels.includes('llama')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with Llama-3.1-405B...");
            const start = Date.now();
            const response = await this.llama!.invoke([
              { role: "user", content: this.buildPrompt(prompt, requirements, framework, "llama") }
            ]);
            submissions.push({
              model: "Llama-3.1-405B",
              code: response.content as string,
              reasoning: "Superior coding logic and architecture",
              executionTime: Date.now() - start,
            });
            console.log(`✓ Llama completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ Llama generation failed:", error);
          }
        })()
      );
    }

    if (this.deepseek && this.availableModels.includes('deepseek')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with DeepSeek-Coder...");
            const start = Date.now();
            const response = await this.deepseek!.invoke([
              { role: "user", content: this.buildPrompt(prompt, requirements, framework, "deepseek") }
            ]);
            submissions.push({
              model: "DeepSeek-Coder-V3",
              code: response.content as string,
              reasoning: "Specialized in clean, efficient code generation",
              executionTime: Date.now() - start,
            });
            console.log(`✓ DeepSeek completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ DeepSeek generation failed:", error);
          }
        })()
      );
    }

    if (this.gemini && this.availableModels.includes('gemini')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with Gemini-1.5-Pro...");
            const start = Date.now();
            const response = await this.gemini!.invoke([
              new HumanMessage(this.buildPrompt(prompt, requirements, framework, "gemini"))
            ]);
            submissions.push({
              model: "Gemini-1.5-Pro",
              code: response.content as string,
              reasoning: "Strong at complex UI logic and interactions",
              executionTime: Date.now() - start,
            });
            console.log(`✓ Gemini completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ Gemini generation failed:", error);
          }
        })()
      );
    }

    if (this.mistral && this.availableModels.includes('mistral')) {
      generatePromises.push(
        (async () => {
          try {
            console.log("Generating with Mistral-Large-2...");
            const start = Date.now();
            const response = await this.mistral!.invoke([
              new HumanMessage(this.buildPrompt(prompt, requirements, framework, "mistral"))
            ]);
            submissions.push({
              model: "Mistral-Large-2",
              code: response.content as string,
              reasoning: "Balanced performance across all tasks",
              executionTime: Date.now() - start,
            });
            console.log(`✓ Mistral completed in ${Date.now() - start}ms`);
          } catch (error) {
            console.error("✗ Mistral generation failed:", error);
          }
        })()
      );
    }

    // Wait for all models to complete
    await Promise.all(generatePromises);

    if (submissions.length === 0) {
      throw new Error("No models were able to generate code. Please check your API keys.");
    }

    console.log(`\n📊 Received ${submissions.length} submissions. Evaluating...`);

    // Step 3: Evaluate submissions
    let bestSubmission = submissions[0];

    if (submissions.length > 1) {
      const evaluationPrompt = `
Evaluate these ${submissions.length} code solutions for: "${prompt}"

Score each (0-10) based on:
- Code quality (30%)
- Functionality (25%)
- UI/UX design (20%)
- Performance (15%)
- Innovation (10%)

${submissions.map((sub, i) => `
${i + 1}. ${sub.model}:
\`\`\`
${sub.code.slice(0, 1500)}...
\`\`\`
`).join('\n')}

Respond in JSON only:
{
  "scores": [
    {"model": "${submissions[0].model}", "score": 8.5}
  ],
  "winner": "${submissions[0].model}",
  "winnerScore": 8.5
}
`;

      try {
        const evaluation = await this.evaluator.invoke([new HumanMessage(evaluationPrompt)]);
        const result = JSON.parse(evaluation.content as string);

        // Find winning submission
        const winningModel = result.winner || result.scores[0]?.model;
        bestSubmission = submissions.find(s => s.model === winningModel) || submissions[0];

        console.log(`🏆 Winner: ${bestSubmission.model} with score ${result.winnerScore || result.scores[0]?.score}`);
      } catch (error) {
        console.error("Evaluation failed, using first submission:", error);
        bestSubmission = submissions[0];
      }
    } else {
      console.log(`🏆 Single submission from: ${bestSubmission.model}`);
    }

    return {
      code: bestSubmission.code,
      model: bestSubmission.model,
      score: 8.5,
      models: submissions.map(s => s.model),
      executionDetails: {
        submissions,
        totalModels: submissions.length,
        framework,
        requirements,
      },
    };
  }
}