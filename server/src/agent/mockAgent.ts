import { ToolRegistry } from './tools/registry.js';

export interface MockStepPlan {
  thought: string;
  action?: {
    tool: string;
    params: any;
  };
  simulatedObservation?: string;
  finalAnswer?: string;
  delayMs?: number;
}

/**
 * Generates a realistic, deterministic multi-step ReAct trajectory for DEMO_MODE.
 */
export function getMockPlanForPrompt(prompt: string, orbiter?: string): MockStepPlan[] {
  const isTest = process.env.NODE_ENV === 'test' || typeof process.env.VITEST !== 'undefined';
  const scaleDelay = (d: number) => (isTest ? 5 : d);
  const lower = prompt.toLowerCase();
  const activeOrbiter = (orbiter || 'scout').toLowerCase();

  // Uptime Watchdog Orbiter Plan
  if (activeOrbiter === 'uptime' || lower.includes('uptime') || lower.includes('health') || lower.includes('status')) {
    return [
      {
        thought: 'Inspecting target endpoint reachability, HTTP headers, and SSL handshake metrics.',
        action: {
          tool: 'web_fetch',
          params: { url: 'https://news.ycombinator.com', max_length: 300 },
        },
        simulatedObservation: 'HTTP 200 OK. Response latency: 142ms. TLS 1.3 negotiated. Valid certificate through 2027.',
        delayMs: scaleDelay(1000),
      },
      {
        thought: 'Endpoint is fully healthy. Storing latency baseline into agent memory for anomaly detection.',
        action: {
          tool: 'store_memory',
          params: {
            key: 'endpoint_latency_baseline',
            value: '142ms at 2026-09-13 (Status 200 OK)',
          },
        },
        simulatedObservation: 'Stored in memory: "endpoint_latency_baseline" = "142ms at 2026-09-13 (Status 200 OK)".',
        delayMs: scaleDelay(800),
      },
      {
        thought: 'Setting up persistent background sentinel to ping the service every 15 minutes.',
        action: {
          tool: 'schedule_cron',
          params: {
            name: 'Service Health Sentinel',
            cron_expression: '*/15 * * * *',
            prompt: 'Verify HTTP status and response time under 300ms',
          },
        },
        simulatedObservation: 'Successfully scheduled "Service Health Sentinel" (every 15 min).',
        delayMs: scaleDelay(900),
      },
      {
        thought: 'Formulating health report for operator.',
        finalAnswer: 'Uptime Sentinel Verification: Target endpoint is operational (HTTP 200 OK, latency 142ms, TLS 1.3 valid). An automated heartbeat check has been registered for every 15 minutes.',
        delayMs: scaleDelay(600),
      },
    ];
  }

  // Executive Briefer Orbiter Plan
  if (activeOrbiter === 'brief' || lower.includes('brief') || lower.includes('summary') || lower.includes('digest')) {
    return [
      {
        thought: 'Retrieving user preference parameters and past memory records to tailor the briefing.',
        action: {
          tool: 'retrieve_memory',
          params: {},
        },
        simulatedObservation: 'Loaded 4 historical memory items including price baselines and tech bookmarks.',
        delayMs: scaleDelay(900),
      },
      {
        thought: 'Searching web for recent high-impact developments on the requested topic.',
        action: {
          tool: 'web_search',
          params: { query: prompt.slice(0, 40), max_results: 3 },
        },
        simulatedObservation: 'Top findings:\n1. Latest industry benchmark shows 38% adoption growth in autonomous edge agents.\n2. Standardized MCP protocols established across major IDEs.\n3. Zero-domain deployment models gaining enterprise preference.',
        delayMs: scaleDelay(1100),
      },
      {
        thought: 'Synthesizing concise executive brief with actionable takeaways.',
        finalAnswer: `### Executive Brief: ${prompt}\n\n• **Core Finding**: Market signals indicate rapid consolidation around edge-native agent architectures.\n• **Operational Status**: Background cron monitors are active and healthy.\n• **Recommended Action**: Maintain automated 4-hour polling cycle and preserve telemetry in SQLite memory.`,
        delayMs: scaleDelay(700),
      },
    ];
  }

  // Scenario 1: Flight Price Watcher (or Bargain Sentinel)
  if (activeOrbiter === 'bargain' || lower.includes('flight') || lower.includes('price') || lower.includes('ticket')) {
    return [
      {
        thought: 'Searching the web to discover active airline fare aggregators and promotional routes.',
        action: {
          tool: 'web_search',
          params: { query: 'cheap flights chisinau to london flyone wizzair deals', max_results: 3 },
        },
        simulatedObservation: 'Top search results:\n1. Skyscanner: Direct flights Chișinău to London from $118.\n2. Google Flights: FlyOne fare $118 round-trip dates available.\n3. WizzAir: Standard fares starting at $142.',
        delayMs: scaleDelay(1100),
      },
      {
        thought: 'I will retrieve previously recorded price memories for comparison.',
        action: {
          tool: 'retrieve_memory',
          params: { key: 'min_flight_rmo_lon' },
        },
        simulatedObservation: 'Previous recorded lowest fare was $134 recorded on 2026-08-28.',
        delayMs: scaleDelay(900),
      },
      {
        thought: 'The current $118 fare is $16 cheaper than our previous record. I will store this new historical minimum into persistent memory.',
        action: {
          tool: 'store_memory',
          params: {
            key: 'min_flight_rmo_lon',
            value: '$118 via FlyOne 5F 821 on 2026-09-13',
          },
        },
        simulatedObservation: 'Stored in memory: "min_flight_rmo_lon" = "$118 via FlyOne 5F 821 on 2026-09-13".',
        delayMs: scaleDelay(800),
      },
      {
        thought: 'To catch future price drops or seat releases, I will register a background cron job to inspect the route every 4 hours.',
        action: {
          tool: 'schedule_cron',
          params: {
            name: 'RMO-LON Flight Sentinel',
            cron_expression: '0 */4 * * *',
            prompt: 'Monitor flight prices from Chișinău to London under $125',
          },
        },
        simulatedObservation: 'Successfully scheduled recurring job "RMO-LON Flight Sentinel". Next cycle in 4 hours.',
        delayMs: scaleDelay(1000),
      },
      {
        thought: 'All tasks completed successfully. Formulating deal briefing.',
        finalAnswer: 'Deal detected: FlyOne 5F 821 (Chișinău to London Luton) is currently $118, which is $16 cheaper than the prior benchmark ($134). Long-term memory has been updated, and an automated background monitor is set to scan every 4 hours.',
        delayMs: scaleDelay(600),
      },
    ];
  }

  // Scenario 2: Radar Scout / Tech Trend Radar
  if (activeOrbiter === 'radar' || lower.includes('news') || lower.includes('hacker') || lower.includes('trend') || lower.includes('radar')) {
    return [
      {
        thought: 'Searching web discussions and tech radar feeds for trending releases.',
        action: {
          tool: 'web_search',
          params: { query: 'trending open-source AI agents github hacker news', max_results: 3 },
        },
        simulatedObservation: 'Top results:\n1. Show HN: AgentOrbit - Autonomous Action Cockpit for Telegram (342 pts, 89 comments)\n2. GitHub: SQLite WAL2 and FTS5 full-text integration release\n3. Hacker News: Locally hosting 70B models on commodity hardware',
        delayMs: scaleDelay(1100),
      },
      {
        thought: 'Item #1 is gaining substantial traction. I will record the trending metadata into agent memory.',
        action: {
          tool: 'store_memory',
          params: {
            key: 'trending_ai_agent_hn',
            value: 'AgentOrbit (342 points, 89 comments on 2026-09-13)',
          },
        },
        simulatedObservation: 'Stored in memory: "trending_ai_agent_hn" = "AgentOrbit (342 points, 89 comments on 2026-09-13)".',
        delayMs: scaleDelay(800),
      },
      {
        thought: 'I will configure a daily morning scan at 08:30 UTC to track technical releases autonomously.',
        action: {
          tool: 'schedule_cron',
          params: {
            name: 'Morning Tech Radar',
            cron_expression: '30 8 * * *',
            prompt: 'Extract top 3 open-source AI announcements and summarize highlights',
          },
        },
        simulatedObservation: 'Successfully scheduled recurring job "Morning Tech Radar" with cron "30 8 * * *".',
        delayMs: scaleDelay(900),
      },
      {
        thought: 'Ready to present key findings to the operator.',
        finalAnswer: 'Tech radar scan complete: The top trending item is "Show HN: AgentOrbit - Autonomous Action Cockpit" with 342 points. Milestone saved to long-term memory and daily morning scans scheduled.',
        delayMs: scaleDelay(600),
      },
    ];
  }

  // Scenario 3: Human-in-the-Loop clearance demo (webhook / alert)
  if (lower.includes('webhook') || lower.includes('post') || lower.includes('dispatch') || lower.includes('approve')) {
    return [
      {
        thought: 'Preparing payload for outbound external dispatch. Because this tool sends external data, it requires explicit operator approval.',
        action: {
          tool: 'http_post',
          params: {
            url: 'https://api.demo.orbit/v1/deploy-webhook',
            payload: { action: 'trigger_event', source: 'AgentOrbit', timestamp: Date.now() },
          },
        },
        simulatedObservation: 'HTTP 200 OK: Outbound webhook delivered successfully after operator clearance.',
        delayMs: scaleDelay(1200),
      },
      {
        thought: 'The sensitive dispatch has succeeded with confirmed operator clearance. Recording confirmation into memory.',
        action: {
          tool: 'store_memory',
          params: {
            key: 'last_approved_dispatch',
            value: `Executed at ${new Date().toISOString()}`,
          },
        },
        simulatedObservation: 'Stored in memory: "last_approved_dispatch".',
        delayMs: scaleDelay(800),
      },
      {
        thought: 'Finalizing task summary.',
        finalAnswer: 'Outbound webhook was reviewed, approved, and dispatched cleanly. Verification record is stored in long-term memory.',
        delayMs: scaleDelay(500),
      },
    ];
  }

  // Generic Dynamic Plan
  return [
    {
      thought: `Parsing goal: "${prompt}". Checking existing user memory for context or past parameters.`,
      action: {
        tool: 'retrieve_memory',
        params: {},
      },
      simulatedObservation: 'Retrieved 2 memory entries: [system_preference: "concise reports"], [preferred_region: "Europe/Chisinau"].',
      delayMs: scaleDelay(900),
    },
    {
      thought: `Searching web for real-time data related to: "${prompt}".`,
      action: {
        tool: 'web_search',
        params: { query: prompt.slice(0, 40), max_results: 3 },
      },
      simulatedObservation: `Found relevant search results for "${prompt.slice(0, 30)}": Verified sources and real-time status feeds retrieved.`,
      delayMs: scaleDelay(1100),
    },
    {
      thought: `Synthesizing structured findings for "${prompt}" and persisting key milestone in agent memory.`,
      action: {
        tool: 'store_memory',
        params: {
          key: `goal_${Date.now().toString().slice(-6)}`,
          value: `Completed execution for: ${prompt.slice(0, 40)}`,
        },
      },
      simulatedObservation: 'Stored execution milestone in long-term memory.',
      delayMs: scaleDelay(800),
    },
    {
      thought: 'Goal execution successfully completed. Producing final deliverable.',
      finalAnswer: `Autonomous execution completed for your objective: "${prompt}". Relevant context was verified, live data was gathered, and the outcome has been recorded to persistent memory.`,
      delayMs: scaleDelay(600),
    },
  ];
}
