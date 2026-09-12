import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { getDatabase } from '../db/database.js';
import { ToolRegistry, AgentContext } from './tools/registry.js';
import { AgentContextWindow } from './context.js';
import { getMockPlanForPrompt, MockStepPlan } from './mockAgent.js';
import { LlmProvider } from './llmAdapter.js';

export type StepType = 'THOUGHT' | 'ACTION' | 'OBSERVATION' | 'FINAL_ANSWER' | 'SYSTEM' | 'ERROR' | 'WAITING_APPROVAL';

export interface AgentStepEvent {
  taskId: string;
  stepNumber: number;
  type: StepType;
  thought?: string;
  toolName?: string;
  toolInput?: any;
  toolOutput?: string;
  finalAnswer?: string;
  timestamp: number;
}

export interface ReActExecutionOptions {
  taskId: string;
  userId: string;
  prompt: string;
  registry: ToolRegistry;
  llmProvider: LlmProvider;
  botSendMessage?: (chatId: string | number, text: string) => Promise<void>;
  maxSteps?: number;
}

// Global registry for tasks waiting for human approval
export const pendingApprovalWaiters = new Map<string, (approved: boolean) => void>();

export class ReActEngine extends EventEmitter {
  constructor() {
    super();
  }

  private isDemoMode(): boolean {
    return (
      process.env.DEMO_MODE === 'true' ||
      process.env.LLM_PROVIDER === 'mock' ||
      (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY)
    );
  }

  async runTask(options: ReActExecutionOptions): Promise<string> {
    const { taskId, userId, prompt, registry, llmProvider, botSendMessage, maxSteps = 8 } = options;
    const db = getDatabase();
    const contextWindow = new AgentContextWindow(maxSteps);

    // Update task status to running
    db.prepare(`UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ?`).run(Date.now(), taskId);

    this.emitStep({
      taskId,
      stepNumber: 0,
      type: 'SYSTEM',
      thought: `Agent initialized. Objective: "${prompt}"`,
      timestamp: Date.now(),
    });

    const context: AgentContext = {
      userId,
      taskId,
      botSendMessage,
      requestApproval: async (toolName: string, parameters: any): Promise<boolean> => {
        // Record pending approval in database
        const approvalId = nanoid();
        db.prepare(`
          INSERT INTO pending_approvals (id, task_id, tool_name, parameters, status, created_at)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `).run(approvalId, taskId, toolName, JSON.stringify(parameters), Date.now());

        db.prepare(`UPDATE tasks SET status = 'waiting_approval', updated_at = ? WHERE id = ?`).run(Date.now(), taskId);

        this.emitStep({
          taskId,
          stepNumber: 999,
          type: 'WAITING_APPROVAL',
          toolName,
          toolInput: parameters,
          thought: `Security Guard: Tool "${toolName}" requires human clearance before proceeding.`,
          timestamp: Date.now(),
        });

        // If bot message capability is available, send Telegram inline approval request
        if (botSendMessage) {
          await botSendMessage(
            userId,
            `⚠️ *Action Approval Required*\n\nThe agent requests permission to execute:\n• *Tool*: \`${toolName}\`\n• *Parameters*: \`\`\`json\n${JSON.stringify(parameters, null, 2)}\n\`\`\`\nOpen the Mini App cockpit or reply to confirm.`
          );
        }

        // Return a promise that resolves when user approves or denies
        return new Promise<boolean>((resolve) => {
          pendingApprovalWaiters.set(taskId, (approved: boolean) => {
            db.prepare(`UPDATE pending_approvals SET status = ? WHERE id = ?`).run(
              approved ? 'approved' : 'rejected',
              approvalId
            );
            pendingApprovalWaiters.delete(taskId);
            resolve(approved);
          });
        });
      },
    };

    if (this.isDemoMode()) {
      return await this.runDemoMode(options, context);
    }

    return await this.runLiveLlm(options, contextWindow, context);
  }

  /**
   * Deterministic simulated ReAct run for DEMO_MODE.
   * Invokes real tools where appropriate to truly persist data in SQLite.
   */
  private async runDemoMode(options: ReActExecutionOptions, context: AgentContext): Promise<string> {
    const { taskId, prompt, registry } = options;
    const db = getDatabase();
    const plan: MockStepPlan[] = getMockPlanForPrompt(prompt);

    let stepCounter = 1;
    let finalResult = 'Goal accomplished successfully.';

    for (const stepPlan of plan) {
      if (stepPlan.delayMs) {
        await new Promise((r) => setTimeout(r, stepPlan.delayMs));
      }

      // 1. Thought Step
      this.emitStep({
        taskId,
        stepNumber: stepCounter,
        type: 'THOUGHT',
        thought: stepPlan.thought,
        timestamp: Date.now(),
      });

      // 2. Action Step
      if (stepPlan.action) {
        const { tool, params } = stepPlan.action;
        this.emitStep({
          taskId,
          stepNumber: stepCounter,
          type: 'ACTION',
          toolName: tool,
          toolInput: params,
          thought: `Invoking tool ${tool}`,
          timestamp: Date.now(),
        });

        let observation = '';
        const registeredTool = registry.get(tool);

        if (registeredTool) {
          // Execute the tool so SQLite memory and schedules are authentically created!
          try {
            observation = await registry.execute(tool, params, context);
          } catch (err: any) {
            observation = `Tool error: ${err.message}`;
          }
        } else {
          observation = stepPlan.simulatedObservation || 'Observation recorded.';
        }

        // 3. Observation Step
        this.emitStep({
          taskId,
          stepNumber: stepCounter,
          type: 'OBSERVATION',
          toolName: tool,
          toolOutput: observation,
          timestamp: Date.now(),
        });
      }

      // 4. Final Answer Step
      if (stepPlan.finalAnswer) {
        finalResult = stepPlan.finalAnswer;
        this.emitStep({
          taskId,
          stepNumber: stepCounter,
          type: 'FINAL_ANSWER',
          finalAnswer: finalResult,
          thought: 'Synthesized final answer.',
          timestamp: Date.now(),
        });
        break;
      }

      stepCounter++;
    }

    // Mark task completed
    db.prepare(`UPDATE tasks SET status = 'completed', result = ?, updated_at = ? WHERE id = ?`).run(
      finalResult,
      Date.now(),
      taskId
    );

    return finalResult;
  }

  /**
   * Live LLM ReAct Loop with parser and tool dispatcher
   */
  private async runLiveLlm(
    options: ReActExecutionOptions,
    contextWindow: AgentContextWindow,
    context: AgentContext
  ): Promise<string> {
    const { taskId, prompt, registry, llmProvider, maxSteps = 8 } = options;
    const db = getDatabase();

    const systemPrompt = `You are AgentOrbit, an autonomous action agent running inside Telegram.
You have access to tools to accomplish user objectives.
Use the following strict ReAct format:

Thought: reason about what step to take next.
Action: tool_name({"parameter_name": "parameter_value"})
Observation: the result of the tool action will appear here.
... (repeat Thought/Action/Observation up to ${maxSteps} times)
Thought: I have finished the objective.
Final Answer: concise, actionable summary of results.

Available Tools:
${registry
  .getAll()
  .map((t) => `- ${t.name}: ${t.description}`)
  .join('\n')}`;

    let currentPrompt = `User Objective: ${prompt}\n\nPlease proceed with your first Thought and Action.`;
    let finalAnswer = '';

    for (let step = 1; step <= maxSteps; step++) {
      const response = await llmProvider.generateStep({
        systemPrompt,
        userPrompt: `${currentPrompt}\n\nExecution History:\n${contextWindow.formatForPrompt()}`,
        tools: registry.getToolDefinitions(),
      });

      const text = response.content.trim();

      // Parse Thought
      const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=Action:|Final Answer:|$)/i);
      const thought = thoughtMatch ? thoughtMatch[1].trim() : text;

      this.emitStep({
        taskId,
        stepNumber: step,
        type: 'THOUGHT',
        thought,
        timestamp: Date.now(),
      });

      // Check for Final Answer
      const finalMatch = text.match(/Final Answer:\s*([\s\S]*)$/i);
      if (finalMatch) {
        finalAnswer = finalMatch[1].trim();
        this.emitStep({
          taskId,
          stepNumber: step,
          type: 'FINAL_ANSWER',
          finalAnswer,
          timestamp: Date.now(),
        });
        break;
      }

      // Check for Action
      const actionMatch = text.match(/Action:\s*([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/i);
      if (actionMatch) {
        const toolName = actionMatch[1].trim();
        let rawParams: any = {};
        try {
          rawParams = JSON.parse(actionMatch[2].trim() || '{}');
        } catch {
          rawParams = { query: actionMatch[2].trim() };
        }

        this.emitStep({
          taskId,
          stepNumber: step,
          type: 'ACTION',
          toolName,
          toolInput: rawParams,
          timestamp: Date.now(),
        });

        const observation = await registry.execute(toolName, rawParams, context);

        this.emitStep({
          taskId,
          stepNumber: step,
          type: 'OBSERVATION',
          toolName,
          toolOutput: observation,
          timestamp: Date.now(),
        });

        contextWindow.addStep({
          stepNumber: step,
          thought,
          action: { tool: toolName, params: rawParams },
          observation,
          timestamp: Date.now(),
        });

        currentPrompt = `Observation: ${observation}\nWhat is your next Thought and Action?`;
      } else {
        // No action detected, terminate loop
        finalAnswer = thought;
        this.emitStep({
          taskId,
          stepNumber: step,
          type: 'FINAL_ANSWER',
          finalAnswer,
          timestamp: Date.now(),
        });
        break;
      }
    }

    db.prepare(`UPDATE tasks SET status = 'completed', result = ?, updated_at = ? WHERE id = ?`).run(
      finalAnswer || 'Task completed.',
      Date.now(),
      taskId
    );

    return finalAnswer || 'Task completed.';
  }

  private emitStep(event: AgentStepEvent): void {
    const db = getDatabase();
    const id = nanoid();

    // Persist step into SQLite
    db.prepare(`
      INSERT INTO execution_steps (id, task_id, step_number, type, thought, tool_name, tool_input, tool_output, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      event.taskId,
      event.stepNumber,
      event.type,
      event.thought || null,
      event.toolName || null,
      event.toolInput ? JSON.stringify(event.toolInput) : null,
      event.toolOutput || event.finalAnswer || null,
      event.timestamp
    );

    // Emit event for real-time SSE stream listeners
    this.emit(`step:${event.taskId}`, event);
    this.emit('step', event);
  }
}

export const globalReActEngine = new ReActEngine();
