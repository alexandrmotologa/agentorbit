import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { validateUrlForSsrf } from '../src/security/guard.js';
import { createDefaultRegistry } from '../src/agent/tools/registry.js';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { ReActEngine } from '../src/agent/loop.js';
import { createLlmProvider } from '../src/agent/llmAdapter.js';
import fs from 'fs';

const TEST_DB_PATH = 'data/test_agentorbit.db';

describe('Security & SSRF Guard', () => {
  it('blocks loopback and local IP addresses', () => {
    expect(validateUrlForSsrf('http://127.0.0.1:8080/secret').safe).toBe(false);
    expect(validateUrlForSsrf('http://localhost:3000').safe).toBe(false);
    expect(validateUrlForSsrf('http://0.0.0.0/').safe).toBe(false);
  });

  it('blocks private IPv4 networks (RFC 1918)', () => {
    expect(validateUrlForSsrf('http://10.0.0.5/api').safe).toBe(false);
    expect(validateUrlForSsrf('http://192.168.1.1/admin').safe).toBe(false);
    expect(validateUrlForSsrf('http://172.20.0.10').safe).toBe(false);
  });

  it('blocks Cloud metadata endpoint', () => {
    expect(validateUrlForSsrf('http://169.254.169.254/latest/meta-data/').safe).toBe(false);
  });

  it('blocks internal suffixes', () => {
    expect(validateUrlForSsrf('http://internal-database.local/query').safe).toBe(false);
    expect(validateUrlForSsrf('http://service.internal/status').safe).toBe(false);
  });

  it('allows valid public endpoints', () => {
    const result = validateUrlForSsrf('https://api.github.com/repos');
    expect(result.safe).toBe(true);
    expect(result.url?.hostname).toBe('api.github.com');
  });
});

describe('Tool Registry & Memory Store', () => {
  beforeAll(() => {
    getDatabase(TEST_DB_PATH);
  });

  beforeEach(() => {
    const db = getDatabase(TEST_DB_PATH);
    db.exec(`
      DELETE FROM execution_steps;
      DELETE FROM tasks;
      DELETE FROM agent_memory;
      DELETE FROM scheduled_jobs;
      DELETE FROM pending_approvals;
    `);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('registers all standard tools', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('web_fetch')).toBeDefined();
    expect(registry.get('schedule_cron')).toBeDefined();
    expect(registry.get('store_memory')).toBeDefined();
    expect(registry.get('retrieve_memory')).toBeDefined();
    expect(registry.get('telegram_alert')).toBeDefined();
    expect(registry.get('http_post')).toBeDefined();
  });

  it('persists and retrieves memory entries correctly', async () => {
    const registry = createDefaultRegistry();
    const context = { userId: 'tester_01', taskId: 'task_01' };

    const storeRes = await registry.execute(
      'store_memory',
      { key: 'flight_budget', value: '150 USD' },
      context
    );
    expect(storeRes).toContain('Stored in memory');

    const getRes = await registry.execute('retrieve_memory', { key: 'flight_budget' }, context);
    expect(getRes).toContain('150 USD');
  });

  it('validates cron expressions and rejects invalid ones', async () => {
    const registry = createDefaultRegistry();
    const context = { userId: 'tester_01', taskId: 'task_02' };

    const invalidRes = await registry.execute(
      'schedule_cron',
      { name: 'Bad Job', cron_expression: 'not a cron', prompt: 'Do something' },
      context
    );
    expect(invalidRes).toContain('Invalid cron expression');

    const validRes = await registry.execute(
      'schedule_cron',
      { name: 'Hourly Scan', cron_expression: '0 * * * *', prompt: 'Scan headlines' },
      context
    );
    expect(validRes).toContain('Successfully scheduled recurring job');
  });
});

describe('ReAct Engine Execution in DEMO_MODE', () => {
  beforeAll(() => {
    getDatabase(TEST_DB_PATH);
    process.env.DEMO_MODE = 'true';
  });

  beforeEach(() => {
    const db = getDatabase(TEST_DB_PATH);
    db.exec(`
      DELETE FROM execution_steps;
      DELETE FROM tasks;
      DELETE FROM agent_memory;
      DELETE FROM scheduled_jobs;
      DELETE FROM pending_approvals;
    `);
  });

  afterAll(() => {
    closeDatabase();
  });

  it('executes a multi-step flight price watcher plan and terminates with final answer', async () => {
    const engine = new ReActEngine();
    const registry = createDefaultRegistry();
    const llmProvider = createLlmProvider(registry);
    const db = getDatabase(TEST_DB_PATH);

    const taskId = 'task_test_flight';
    const userId = 'pilot_test';
    const prompt = 'Monitor flight prices from Chișinău to London under $125';

    db.prepare(`
      INSERT INTO tasks (id, user_id, prompt, status, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `).run(taskId, userId, prompt, Date.now(), Date.now());

    const emittedSteps: any[] = [];
    engine.on(`step:${taskId}`, (event) => {
      emittedSteps.push(event);
    });

    const result = await engine.runTask({
      taskId,
      userId,
      prompt,
      registry,
      llmProvider,
    });

    expect(result).toBeDefined();
    expect(result).toContain('FlyOne');

    // Verify task status in database
    const taskRecord = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(taskId) as any;
    expect(taskRecord.status).toBe('completed');
    expect(taskRecord.result).toBe(result);

    // Verify steps recorded in database
    const stepRecords = db.prepare(`SELECT * FROM execution_steps WHERE task_id = ?`).all(taskId);
    expect(stepRecords.length).toBeGreaterThanOrEqual(4);

    // Verify events were emitted in order
    const types = emittedSteps.map((s) => s.type);
    expect(types).toContain('THOUGHT');
    expect(types).toContain('ACTION');
    expect(types).toContain('OBSERVATION');
    expect(types).toContain('FINAL_ANSWER');
  });
});
