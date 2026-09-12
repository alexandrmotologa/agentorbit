import { z } from 'zod';
import { validateUrlForSsrf } from '../../security/guard.js';
import { getDatabase } from '../../db/database.js';
import { nanoid } from 'nanoid';
import { CronExpressionParser } from 'cron-parser';

export interface AgentContext {
  userId: string;
  taskId: string;
  botSendMessage?: (chatId: string | number, text: string) => Promise<void>;
  requestApproval?: (toolName: string, parameters: any) => Promise<boolean>;
}

export interface AgentTool<T = any> {
  name: string;
  description: string;
  schema: z.ZodSchema<T>;
  requiresApproval?: boolean;
  execute(params: T, context: AgentContext): Promise<string>;
}

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): Array<{ name: string; description: string; parameters: any }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: (tool.schema as any)._def,
    }));
  }

  async execute(name: string, rawParams: any, context: AgentContext): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered in ToolRegistry.`);
    }

    // Validate parameters with Zod schema
    const parsedParams = tool.schema.safeParse(rawParams);
    if (!parsedParams.success) {
      const issues = parsedParams.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      return `Error: Invalid parameters for tool "${name}": ${issues}`;
    }

    // Check if human approval is required
    if (tool.requiresApproval && context.requestApproval) {
      const approved = await context.requestApproval(name, parsedParams.data);
      if (!approved) {
        return `Execution blocked: User rejected permission to run tool "${name}".`;
      }
    }

    try {
      return await tool.execute(parsedParams.data, context);
    } catch (err: any) {
      return `Execution error in tool "${name}": ${err.message || String(err)}`;
    }
  }
}

// ---------------------------------------------------------------------
// Standard Sandboxed Tool Implementations
// ---------------------------------------------------------------------

/**
 * web_fetch: Fetches public webpage and extracts readable text with SSRF guard.
 */
export const webFetchTool: AgentTool<{ url: string; max_length?: number }> = {
  name: 'web_fetch',
  description: 'Fetches the content of a public URL and extracts text. Protected against SSRF and private networks.',
  schema: z.object({
    url: z.string().url().describe('The public HTTP or HTTPS URL to fetch'),
    max_length: z.number().optional().default(2000).describe('Maximum length of returned text content'),
  }),
  async execute({ url, max_length = 2000 }) {
    const check = validateUrlForSsrf(url);
    if (!check.safe) {
      return `Blocked: SSRF guard prevented access to ${url}. Reason: ${check.error}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'AgentOrbit/1.0 (Autonomous Bot; +https://github.com/alexandrmotologa/agentorbit)',
          'Accept': 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return `HTTP error ${res.status} ${res.statusText} fetching ${url}`;
      }

      const contentType = res.headers.get('content-type') || '';
      let text = await res.text();

      // If HTML, strip script/style tags and clean HTML entities
      if (contentType.includes('html')) {
        text = text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (text.length > max_length) {
        text = text.slice(0, max_length) + `\n... [Truncated ${text.length - max_length} additional characters]`;
      }

      return text || 'Webpage returned empty text content.';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return `Timeout: Fetching ${url} took longer than 7 seconds.`;
      }
      return `Failed to fetch URL ${url}: ${err.message}`;
    }
  },
};

/**
 * schedule_cron: Registers a background automation in SQLite.
 */
export const scheduleCronTool: AgentTool<{ name: string; cron_expression: string; prompt: string }> = {
  name: 'schedule_cron',
  description: 'Schedules a recurring background agent job using standard 5-part cron syntax (e.g., "*/30 * * * *" for every 30 minutes).',
  schema: z.object({
    name: z.string().min(2).describe('A clear descriptive label for the scheduled automation'),
    cron_expression: z.string().describe('Standard 5-part cron expression (e.g., "0 9 * * *" or "*/15 * * * *")'),
    prompt: z.string().min(5).describe('The autonomous prompt or goal the agent will execute each cycle'),
  }),
  async execute({ name, cron_expression, prompt }, context) {
    try {
      const interval = CronExpressionParser.parse(cron_expression);
      const nextDate = interval.next().toDate();
      const nextRunAt = nextDate.getTime();

      const db = getDatabase();
      const jobId = nanoid();
      const now = Date.now();

      db.prepare(`
        INSERT INTO scheduled_jobs (id, user_id, name, cron_expression, prompt, is_active, last_run_at, next_run_at, created_at)
        VALUES (?, ?, ?, ?, ?, 1, NULL, ?, ?)
      `).run(jobId, context.userId, name, cron_expression, prompt, nextRunAt, now);

      return `Successfully scheduled recurring job "${name}" (ID: ${jobId}). Next run: ${nextDate.toISOString()}. Cron: ${cron_expression}.`;
    } catch (err: any) {
      return `Invalid cron expression "${cron_expression}": ${err.message}`;
    }
  },
};

/**
 * store_memory: Saves long-term memory key-value fact into SQLite.
 */
export const storeMemoryTool: AgentTool<{ key: string; value: string }> = {
  name: 'store_memory',
  description: 'Persists a key-value fact or observation into long-term agent memory for this user.',
  schema: z.object({
    key: z.string().min(1).describe('The memory identifier or subject (e.g., "last_flight_price_chisinau_london")'),
    value: z.string().min(1).describe('The fact or value to remember (e.g., "118 USD on 2026-09-13")'),
  }),
  async execute({ key, value }, context) {
    const db = getDatabase();
    const now = Date.now();
    const id = nanoid();

    db.prepare(`
      INSERT INTO agent_memory (id, user_id, key, value, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(id, context.userId, key, value, now);

    return `Stored in memory: "${key}" = "${value}".`;
  },
};

/**
 * retrieve_memory: Retrieves a key-value fact from long-term memory.
 */
export const retrieveMemoryTool: AgentTool<{ key?: string }> = {
  name: 'retrieve_memory',
  description: 'Retrieves stored long-term memory facts. If key is provided, returns that specific value. Otherwise returns all memory items for the user.',
  schema: z.object({
    key: z.string().optional().describe('Optional key to look up. If omitted, returns all user memories.'),
  }),
  async execute({ key }, context) {
    const db = getDatabase();

    if (key) {
      const row = db.prepare(`SELECT value, updated_at FROM agent_memory WHERE user_id = ? AND key = ?`).get(context.userId, key) as any;
      if (!row) {
        return `No memory entry found for key "${key}".`;
      }
      return `Memory [${key}]: ${row.value} (Updated: ${new Date(row.updated_at).toISOString()})`;
    }

    const rows = db.prepare(`SELECT key, value, updated_at FROM agent_memory WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`).all(context.userId) as any[];
    if (!rows || rows.length === 0) {
      return 'Memory store is currently empty for this user.';
    }

    const items = rows.map((r) => `- ${r.key}: ${r.value}`).join('\n');
    return `Stored Memory Items:\n${items}`;
  },
};

/**
 * telegram_alert: Sends an instant proactive notification to the user chat.
 */
export const telegramAlertTool: AgentTool<{ message: string }> = {
  name: 'telegram_alert',
  description: 'Sends an instant proactive Telegram notification directly to the user chat.',
  schema: z.object({
    message: z.string().min(1).describe('The notification message text to deliver to the user'),
  }),
  async execute({ message }, context) {
    if (context.botSendMessage) {
      try {
        await context.botSendMessage(context.userId, `🔔 *Agent Alert*\n\n${message}`);
        return `Telegram alert successfully delivered to user ${context.userId}.`;
      } catch (err: any) {
        return `Failed to send Telegram message: ${err.message}`;
      }
    }
    return `Simulation: Telegram alert queued for user ${context.userId}: "${message}"`;
  },
};

/**
 * http_post: Sends an outbound webhook or external transaction.
 * Marked with requiresApproval: true for Human-in-the-Loop protection.
 */
export const httpPostTool: AgentTool<{ url: string; payload: Record<string, any> }> = {
  name: 'http_post',
  description: 'Sends an outbound HTTP POST webhook with JSON payload. Requires explicit human clearance before dispatching.',
  schema: z.object({
    url: z.string().url().describe('The external destination URL for the POST webhook'),
    payload: z.record(z.any()).describe('JSON object to transmit in the POST body'),
  }),
  requiresApproval: true,
  async execute({ url, payload }) {
    const check = validateUrlForSsrf(url);
    if (!check.safe) {
      return `Blocked: SSRF guard prevented POST access to ${url}. Reason: ${check.error}`;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentOrbit/1.0',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      return `POST to ${url} returned status ${res.status}: ${responseText.slice(0, 500)}`;
    } catch (err: any) {
      return `POST request failed: ${err.message}`;
    }
  },
};

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(webFetchTool);
  registry.register(scheduleCronTool);
  registry.register(storeMemoryTool);
  registry.register(retrieveMemoryTool);
  registry.register(telegramAlertTool);
  registry.register(httpPostTool);
  return registry;
}
