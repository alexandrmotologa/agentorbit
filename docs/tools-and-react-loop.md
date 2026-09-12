# Tools & ReAct Engine Guide

AgentOrbit provides a sandboxed tool registry and an autonomous execution engine based on the ReAct (Reason + Action) pattern.

---

## Tool Interface Definition

Every tool implements the `AgentTool` TypeScript interface:

```typescript
import { z } from 'zod';

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
```

---

## Built-In Standard Tools

### 1. `web_fetch`
Fetches a public HTTP or HTTPS web page, strips non-content tags (scripts, styles), cleans HTML entities, and extracts readable text.

- **Parameters Schema:**
  - `url` (string, required): Valid HTTP or HTTPS URL.
  - `max_length` (number, optional, default: 2000): Maximum character length of returned text.
- **SSRF Safety Rules:**
  - Loopback (`127.0.0.1`, `localhost`, `0.0.0.0`) is blocked.
  - Private IPv4 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are blocked.
  - Link-local and cloud metadata addresses (`169.254.169.254`) are blocked.
  - Non-HTTP protocols (`file:`, `ftp:`, `gopher:`) are rejected.
  - Timeout: 7-second abort controller.

### 2. `web_search`
Searches the web for keywords using DuckDuckGo / public sources, extracting ranked titles, links, and snippets without requiring external API keys.

- **Parameters Schema:**
  - `query` (string, required, min 2 chars): Search keywords or query.
  - `max_results` (number, optional, default: 5): Maximum items returned (1 to 10).
- **Safety:** Outgoing result URLs are validated by the SSRF guard before presentation to the agent.

### 3. `schedule_cron`
Registers a background autonomous job that triggers periodically in SQLite.

- **Parameters Schema:**
  - `name` (string, required): Human-readable identifier.
  - `cron_expression` (string, required): 5-part cron syntax (e.g., `0 */4 * * *` or `30 8 * * *`).
  - `prompt` (string, required): Objective to execute on each trigger.

### 4. `store_memory`
Saves key-value knowledge into SQLite and automatically synchronizes the `agent_memory_fts` FTS5 virtual table for full-text search.

- **Parameters Schema:**
  - `key` (string, required): Unique identifier (e.g., `last_flight_price`).
  - `value` (string, required): Content or observation to remember.

### 5. `retrieve_memory`
Queries stored facts from SQLite.

- **Parameters Schema:**
  - `key` (string, optional): Specific key to look up. If omitted, returns all user memory entries.

### 6. `telegram_alert`
Sends an immediate notification to the operator chat.

- **Parameters Schema:**
  - `message` (string, required): Content to deliver to user.

### 7. `http_post`
Sends an outbound HTTP POST webhook with a JSON payload.

- **Flags:** `requiresApproval: true` (Triggers human-in-the-loop pause before execution).

---

## Specialized Agent Orbiters

AgentOrbit supports 4 specialized persona modes that tune the system prompt and tool bias:

1. 📡 **Radar Scout (`scout` / `radar`)**: Prioritizes breaking developer discussions, GitHub trending repositories, and Hacker News milestones.
2. 🎯 **Bargain Sentinel (`bargain`)**: Focuses on fare aggregators, calculating discounts, and scheduling recurring threshold checks.
3. 🛡️ **Uptime Watchdog (`uptime`)**: Prioritizes server status, ping latency, SSL validity, and header inspections.
4. ⚡ **Executive Briefer (`brief`)**: Synthesizes multi-source data into concise executive digests with concrete takeaways.

---

## Authoring Custom Tools

To register a custom tool, create an `AgentTool` object and register it with the default registry in `server/src/agent/tools/registry.ts`:

```typescript
export const stockQuoteTool: AgentTool<{ ticker: string }> = {
  name: 'stock_quote',
  description: 'Fetches real-time market price for a given stock ticker symbol.',
  schema: z.object({
    ticker: z.string().min(1).max(5).toUpperCase().describe('Stock ticker symbol (e.g. AAPL, NVDA)'),
  }),
  async execute({ ticker }, context) {
    // Custom tool implementation logic
    return `Ticker ${ticker} currently trading at 224.50 USD.`;
  },
};

// Add to createDefaultRegistry()
registry.register(stockQuoteTool);
```

---

## Security Guard

The SSRF validation module (`server/src/security/guard.ts`) inspects both URL scheme and hostname. If an agent generates an action attempting to fetch internal network assets (such as router gateways or AWS metadata tokens), the tool execution returns an explicit error:

```
Blocked: SSRF guard prevented access to http://169.254.169.254/latest/meta-data/. Reason: Cloud metadata IP 169.254.169.254 is forbidden.
```

The agent observes this message in its loop, adjusts its plan, and avoids the restricted resource.
