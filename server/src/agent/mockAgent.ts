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
export function getMockPlanForPrompt(prompt: string): MockStepPlan[] {
  const isTest = process.env.NODE_ENV === 'test' || typeof process.env.VITEST !== 'undefined';
  const scaleDelay = (d: number) => (isTest ? 5 : d);
  const lower = prompt.toLowerCase();

  // Scenario 1: Flight Price Watcher
  if (lower.includes('flight') || lower.includes('price') || lower.includes('ticket')) {
    return [
      {
        thought: 'I need to check current low-cost flight offerings from Chișinău (RMO) to London (LTN/STN) across target carrier feeds.',
        action: {
          tool: 'web_fetch',
          params: { url: 'https://news.ycombinator.com', max_length: 500 },
        },
        simulatedObservation: 'Found 3 outbound direct routes: WizzAir W4 3791 ($142), FlyOne 5F 821 ($118), HiSky H4 405 ($165). Cheapest fare is FlyOne at $118.',
        delayMs: scaleDelay(1200),
      },
      {
        thought: 'The FlyOne route at $118 meets the affordability threshold. I will retrieve previously recorded price memories for comparison.',
        action: {
          tool: 'retrieve_memory',
          params: { key: 'min_flight_rmo_lon' },
        },
        simulatedObservation: 'Previous recorded lowest fare was $134 recorded on 2026-08-28.',
        delayMs: scaleDelay(1000),
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
        delayMs: scaleDelay(900),
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
        delayMs: scaleDelay(1100),
      },
      {
        thought: 'All tasks completed successfully. I will formulate a concise flight briefing for the user.',
        finalAnswer: 'Deal detected: FlyOne 5F 821 (Chișinău to London Luton) is currently $118, which is $16 cheaper than the prior benchmark ($134). Long-term memory has been updated, and an automated background monitor is set to scan every 4 hours.',
        delayMs: scaleDelay(700),
      },
    ];
  }

  // Scenario 2: HackerNews / Tech Trend Radar
  if (lower.includes('news') || lower.includes('hacker') || lower.includes('trend') || lower.includes('radar')) {
    return [
      {
        thought: 'I will fetch the top trending technical discussions to identify high-velocity open-source AI releases.',
        action: {
          tool: 'web_fetch',
          params: { url: 'https://news.ycombinator.com', max_length: 800 },
        },
        simulatedObservation: 'Fetched 30 frontpage discussions. Top items: 1. "Show HN: AgentOrbit - Autonomous Action Cockpit" (342 pts, 89 comments), 2. "SQLite 3.49 Released with WAL2 stability improvements" (280 pts), 3. "Locally hosting 70B models on commodity hardware" (215 pts).',
        delayMs: 1300,
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
        delayMs: 950,
      },
      {
        thought: 'I will configure a daily morning scan at 08:30 UTC to track technical releases autonomously.',
        action: {
          tool: 'schedule_cron',
          params: {
            name: 'Morning Tech Radar',
            cron_expression: '30 8 * * *',
            prompt: 'Extract top 3 open-source AI announcements from Hacker News and summarize highlights',
          },
        },
        simulatedObservation: 'Successfully scheduled recurring job "Morning Tech Radar" with cron "30 8 * * *".',
        delayMs: 1100,
      },
      {
        thought: 'Ready to present key findings to the operator.',
        finalAnswer: 'Tech radar scan complete: The top trending item on Hacker News is "Show HN: AgentOrbit - Autonomous Action Cockpit" with 342 points. I have saved this milestone to memory and scheduled daily scans for 08:30 UTC.',
        delayMs: 800,
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
        delayMs: 1400,
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
        delayMs: 900,
      },
      {
        thought: 'Finalizing task summary.',
        finalAnswer: 'Outbound webhook was reviewed, approved, and dispatched cleanly. Verification record is stored in long-term memory.',
        delayMs: 600,
      },
    ];
  }

  // Generic Dynamic Plan for any other prompt
  return [
    {
      thought: `Parsing goal: "${prompt}". I will first check existing user memory for context or past parameters.`,
      action: {
        tool: 'retrieve_memory',
        params: {},
      },
      simulatedObservation: 'Retrieved 2 memory entries: [system_preference: "concise reports"], [preferred_region: "Europe/Chisinau"].',
      delayMs: 1100,
    },
    {
      thought: 'Fetching relevant background signals to ground my recommendations with fresh data.',
      action: {
        tool: 'web_fetch',
        params: { url: 'https://news.ycombinator.com', max_length: 400 },
      },
      simulatedObservation: 'Status 200: Successfully parsed public status and live metadata feeds.',
      delayMs: 1200,
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
      delayMs: 900,
    },
    {
      thought: 'Goal execution successfully completed. Producing final deliverable.',
      finalAnswer: `Autonomous execution completed for your objective: "${prompt}". Relevant context was verified, live data was gathered, and the outcome has been recorded to persistent memory.`,
      delayMs: 700,
    },
  ];
}
