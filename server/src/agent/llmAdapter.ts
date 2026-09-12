import { ToolRegistry } from './tools/registry.js';
import { getMockPlanForPrompt, MockStepPlan } from './mockAgent.js';

export interface LlmCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  tools: Array<{ name: string; description: string; parameters: any }>;
  temperature?: number;
}

export interface LlmCompletionResponse {
  content: string;
}

export interface LlmProvider {
  name: string;
  generateStep(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

/**
 * Creates the appropriate LLM provider based on environment variables.
 */
export function createLlmProvider(registry: ToolRegistry): LlmProvider {
  const provider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
  const isDemo = process.env.DEMO_MODE === 'true';

  if (isDemo || provider === 'mock') {
    return new MockLlmProvider();
  }

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return new OpenAiCompatibleProvider({
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }

  if (provider === 'groq' && process.env.GROQ_API_KEY) {
    return new OpenAiCompatibleProvider({
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    });
  }

  if (provider === 'ollama') {
    return new OpenAiCompatibleProvider({
      apiKey: 'ollama',
      baseUrl: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`,
      model: process.env.OLLAMA_MODEL || 'llama3.2',
    });
  }

  // Fallback to Mock provider if live keys are absent
  return new MockLlmProvider();
}

/**
 * OpenAI / Groq / Ollama compatible chat completion caller
 */
class OpenAiCompatibleProvider implements LlmProvider {
  name: string;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(opts: { apiKey: string; baseUrl: string; model: string }) {
    this.name = `OpenAI-Compatible (${opts.model})`;
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.model = opts.model;
  }

  async generateStep(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        temperature: request.temperature ?? 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM provider returned HTTP ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    return { content };
  }
}

/**
 * Simulated LLM Provider for DEMO_MODE
 */
class MockLlmProvider implements LlmProvider {
  name = 'Deterministic Simulation Provider';

  async generateStep(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    // If prompt already contains previous observation, formulate next mock step
    return { content: 'Mock response generated via ReAct loop controller.' };
  }
}
