<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="AgentOrbit Celestial Satellite Logo" width="180" />
</p>

<h1 align="center">AgentOrbit</h1>

<p align="center">
  <b>Autonomous AI agent execution cockpit and scheduler running inside Telegram and Telegram Mini Apps.</b>
</p>

<p align="center">
  <a href="https://github.com/alexandrmotologa/agentorbit/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/alexandrmotologa/agentorbit/ci.yml?branch=main&style=flat-square&logo=github&label=CI" alt="CI Status" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-22%20%7C%2024-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://core.telegram.org/bots/webapps"><img src="https://img.shields.io/badge/Telegram-Mini%20App-24A1DE?style=flat-square&logo=telegram&logoColor=white" alt="Telegram Mini App" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  AgentOrbit moves beyond simple single-turn chatbots into autonomous action agents. It accepts high-level objectives, runs a ReAct (Reason + Action) loop across sandboxed tools, pauses for human clearance on sensitive operations, and streams live thought chains directly to a Telegram Mini App cockpit.
</p>

---

## Core Capabilities

- **Autonomous ReAct Engine:** Executes multi-step objectives with a sliding context scratchpad, structured Zod parameter validation, and an 8-step circuit breaker.
- **Zero-Domain Guarantee:** Uses Telegram Long Polling (`getUpdates`). Runs cleanly on localhost or in Docker without public HTTPS certificates, reverse proxies, or paid hosting.
- **Deterministic Demo Mode (`DEMO_MODE=true`):** Includes realistic multi-step simulations (Flight Price Watcher, Hacker News Tech Radar, Website Diff Sentinel) allowing complete workflow testing without an LLM API key.
- **Dual-Channel Human Clearance (HITL):** When an action requires operator permission (such as dispatching an outbound webhook), the agent pauses. Clearance can be granted via the Mini App sheet or directly in Telegram chat via inline buttons.
- **Real-Time Streaming Cockpit:** Visualizes reasoning steps over Server-Sent Events (SSE) with glowing timeline nodes, parameter inspectors, and a monospace stdout terminal.
- **24/7 Background Automations:** Evaluates 5-part cron expressions in SQLite to execute recurring monitors and dispatch proactive Telegram alerts.
- **Long-Term Memory Explorer:** Records and inspects key-value facts across independent tasks.
- **Hardened Security Boundary:** SSRF protection blocks loopback addresses, private IPv4 ranges (RFC 1918), link-local subnets, and cloud metadata endpoints (`169.254.169.254`).

---

## Application Showcase

### 1. Autonomous Execution Cockpit (Desktop)

Live reasoning timeline streaming thought steps, tool invocations, and observations in real time:

<div align="center">
  <img src="docs/images/screenshot_cockpit_run.png?raw=true" alt="AgentOrbit Desktop Cockpit" width="100%" />
</div>

<br/>

### 2. Mobile View & Operational Subsystems

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <b>Mission Deliverable &amp; Verification</b><br/><br/>
        <img src="docs/images/screenshot_deliverable.png?raw=true" alt="Mission Deliverable Finalized" width="480" />
      </td>
      <td align="center" width="50%">
        <b>Telegram Mini App (Mobile View)</b><br/><br/>
        <img src="docs/images/screenshot_mobile.png?raw=true" alt="Telegram Mobile View" width="280" />
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <b>Background Schedules Manager</b><br/><br/>
        <img src="docs/images/screenshot_schedules.png?raw=true" alt="Active Scheduled Jobs" width="480" />
      </td>
      <td align="center" width="50%">
        <b>Agent Knowledge &amp; Memory Explorer</b><br/><br/>
        <img src="docs/images/screenshot_memory.png?raw=true" alt="Stored Key-Value Memory" width="480" />
      </td>
    </tr>
  </table>
</div>

---

## Architecture Overview

```
+-------------------------------------------------------------------+
|                         Telegram Client                           |
|  +-------------------------+     +-----------------------------+  |
|  |     Chat & Bot UI       |     |     Telegram Mini App       |  |
|  | (/start, /task, alerts, |     | (Thought Chain, Terminal,   |  |
|  |  inline approval cards) |     |  Schedules, Memory Store)   |  |
|  +------------+------------+     +--------------+--------------+  |
+---------------|---------------------------------|-----------------+
                | Long Polling                    | HTTP & SSE Stream
                v                                 v
+-------------------------------------------------------------------+
|                      AgentOrbit Service                           |
|  +-------------------------------------------------------------+  |
|  | Fastify Server (:8080)                                      |  |
|  |  - /api/tasks (Dispatch & State Management)                 |  |
|  |  - /api/tasks/:id/stream (Server-Sent Events)               |  |
|  |  - /api/schedules & /api/memory                             |  |
|  |  - Static asset hosting for compiled React web cockpit      |  |
|  +------------------------------+------------------------------+  |
|                                 |                                 |
|  +------------------------------v------------------------------+  |
|  | Autonomous ReAct Loop Engine                                |  |
|  |  - Thought -> Action -> Observation -> Final Answer         |  |
|  |  - Human-in-the-Loop clearance coordinator                  |  |
|  |  - Pluggable Adapters (OpenAI, Groq, Ollama, Simulator)     |  |
|  +------------------------------+------------------------------+  |
|                                 |                                 |
|  +------------------------------v------------------------------+  |
|  | Sandboxed Tool Registry & Security Layer                    |  |
|  |  - web_fetch, schedule_cron, store_memory, telegram_alert   |  |
|  |  - SSRF Guard (Blocks 127.0.0.1, 10.0.0.0/8, 169.254.0.0)   |  |
|  +------------------------------+------------------------------+  |
|                                 |                                 |
|  +------------------------------v------------------------------+  |
|  | SQLite Database (WAL Mode, node:sqlite)                     |  |
|  |  - tasks, execution_steps, agent_memory, scheduled_jobs     |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

---

## Quickstart

### Prerequisites
- Node.js 22 or higher
- npm 10 or higher

### 1. Clone & Configure

```bash
git clone https://github.com/alexandrmotologa/agentorbit.git
cd agentorbit

# Copy environment template
cp .env.example .env
```

### 2. Install & Run in Demo Mode

Demo mode runs deterministically without an LLM API key or live Telegram token:

```bash
# Install dependencies
npm --prefix server install
npm --prefix web install

# Build static frontend bundle
npm --prefix web run build

# Start the Fastify backend server
npm --prefix server start
```

Visit **`http://localhost:8080`** in your browser to interact with the full execution cockpit.

---

## Live LLM & Telegram Configuration

To connect live models and your personal Telegram bot:

1. Open [@BotFather](https://t.me/botfather) in Telegram, send `/newbot`, and copy the token.
2. Edit `.env`:

```ini
TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather"
DEMO_MODE=false

# Pick your provider: 'openai' | 'groq' | 'ollama'
LLM_PROVIDER=openai
OPENAI_API_KEY="sk-..."
```

3. Restart the server. The bot will begin long polling immediately.

---

## Docker Deployment

A multi-stage `Dockerfile` packages the React frontend, TypeScript server, and SQLite storage into a single container:

```bash
# Build and run with docker compose
docker compose up --build -d
```

Access the cockpit at `http://localhost:8080`. Operational data is persisted in the `agentorbit_data` Docker volume.

---

## Testing & Quality Assurance

Run the automated test suite:

```bash
npm --prefix server test
```

Tests verify:
- SSRF network guard blocks loopback, internal subnets, and cloud metadata IPs.
- Tool schemas validate parameters and reject malformed inputs.
- Persistent SQLite memory and cron expression scheduling.
- ReAct engine multi-step execution and event emission.

---

## Documentation

- [System Architecture](docs/architecture.md)
- [REST & Streaming API Reference](docs/api.md)
- [Tools & ReAct Engine Guide](docs/tools-and-react-loop.md)
- [Telegram Bot & Mini App Guide](docs/bot-guide.md)

---

## License

MIT License. Copyright (c) 2026 Alexandr Motologa.
