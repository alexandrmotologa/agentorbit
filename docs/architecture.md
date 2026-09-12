# System Architecture

AgentOrbit operates as an autonomous action agent cockpit and background scheduler for Telegram and Telegram Mini Apps. The system executes multi-step objectives, invokes sandboxed tools, pauses for operator clearance on sensitive actions, and streams real-time telemetry to the user.

## High-Level Topology

The system comprises three primary subsystems:

1. **Telegram Bot (grammY v1.x):**
   Connects via long polling (`getUpdates`). It operates on local machines without public HTTPS certificates, reverse proxies, or paid domains. It handles `/start`, `/task`, `/templates`, `/schedules`, and `/help` commands, and dispatches interactive inline buttons that open the visual Mini App cockpit.

2. **Backend Execution Engine (Fastify + TypeScript):**
   Provides the core ReAct (Reason + Action) loop, manages a sliding scratchpad context window, enforces SSRF network boundaries, validates tool schemas via Zod, persists execution steps in SQLite, and streams live telemetry over Server-Sent Events (SSE).

3. **Telegram Mini App Cockpit (React + Vite + Tailwind CSS):**
   Renders a mission control cockpit optimized for Telegram's mobile in-app webview (`@twa-dev/sdk`) and desktop browsers. It features an animated Thought Chain visualizer, monospace stdout terminal, human-in-the-loop approval sheets, background schedule manager, and long-term memory explorer.

```
+-----------------------------------------------------------------------+
|                           Telegram Client                             |
|  +------------------------------+   +------------------------------+  |
|  |       Chat & Bot Interface   |   |      Telegram Mini App       |  |
|  | (/start, /task, goal prompts,|   | (Thought Chain, Terminal,    |  |
|  |  inline approval buttons)    |   |  Schedules, Memory Explorer) |  |
|  +--------------+---------------+   +--------------+---------------+  |
+-----------------|----------------------------------|------------------+
                  |                                  |
                  | Long Polling                     | HTTP / SSE Stream
                  v                                  v
+-----------------------------------------------------------------------+
|                         AgentOrbit Service                            |
|  +-----------------------------------------------------------------+  |
|  | Fastify HTTP & SSE Server (:8080)                               |  |
|  |  - POST /api/tasks (Dispatch goal)                              |  |
|  |  - GET  /api/tasks/:id/stream (Server-Sent Events)              |  |
|  |  - POST /api/tasks/:id/approve (Human-in-the-loop clearance)    |  |
|  |  - GET  /api/schedules (Background recurring jobs)              |  |
|  |  - GET  /api/memory (Long-term knowledge store)                 |  |
|  |  - Static asset serving for compiled Mini App                   |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|  +--------------------------------v--------------------------------+  |
|  | Autonomous ReAct Loop Engine                                    |  |
|  |  - Reasoning & Action Coordinator                               |  |
|  |  - Sliding Context Scratchpad                                   |  |
|  |  - Max 8-step safety circuit breaker                            |  |
|  |  - Pluggable LLMs (OpenAI, Groq, Ollama, Simulator)             |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|  +--------------------------------v--------------------------------+  |
|  | Sandboxed Tool Registry & Security Layer                        |  |
|  |  - SSRF Guard (Blocks 127.0.0.1, RFC 1918, 169.254.169.254)     |  |
|  |  - web_fetch (Text extraction with timeout)                     |  |
|  |  - schedule_cron (5-part cron evaluator)                        |  |
|  |  - store_memory & retrieve_memory                               |  |
|  |  - telegram_alert (Proactive notification)                      |  |
|  |  - http_post (Webhook with human approval flag)                 |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|  +--------------------------------v--------------------------------+  |
|  | SQLite Storage (WAL Mode, node:sqlite)                          |  |
|  |  - tasks, execution_steps, agent_memory, scheduled_jobs         |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

## The ReAct (Reason + Action) Loop

The agent follows an iterative reasoning loop:

1. **Thought:** The agent reasons about the objective and identifies what missing information or action is required next.
2. **Action:** The agent picks a registered tool from the registry and generates structured parameters validated against a Zod schema.
3. **Security Clearance:** If the tool has `requiresApproval: true` (e.g. external webhooks), the engine pauses execution, emits a `WAITING_APPROVAL` event, and awaits operator confirmation.
4. **Observation:** The tool executes inside its sandbox. Output (e.g. parsed web text, memory entries, schedule IDs) is returned to the agent scratchpad.
5. **Iteration:** The agent reviews the observation and either plans another step or synthesizes the final deliverable (`Final Answer`).

## SQLite Storage Architecture

All operational data is persisted locally in `data/agentorbit.db` using Node's built-in `node:sqlite` in WAL (Write-Ahead Logging) mode.

- **`tasks`**: Stores individual goal dispatches, operator user IDs, current lifecycle state (`pending`, `running`, `waiting_approval`, `completed`, `failed`), and final synthesized results.
- **`execution_steps`**: Chronological log of thoughts, tool invocations, inputs, observations, and timestamps.
- **`agent_memory`**: Key-value memory entries scoped per user. Used to retain facts across independent tasks.
- **`scheduled_jobs`**: Recurring cron automations evaluated every 10 seconds by the internal tick worker.
- **`pending_approvals`**: Audit log of actions requiring operator clearance.
