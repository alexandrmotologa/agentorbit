import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { nanoid } from 'nanoid';
import { getDatabase, searchMemoryFts } from '../db/database.js';
import { globalReActEngine, pendingApprovalWaiters, AgentStepEvent } from '../agent/loop.js';
import { createDefaultRegistry } from '../agent/tools/registry.js';
import { createLlmProvider } from '../agent/llmAdapter.js';
import { validateTelegramInitData } from '../security/auth.js';
import { CronExpressionParser } from 'cron-parser';

export async function taskRoutes(fastify: FastifyInstance, options: FastifyPluginOptions): Promise<void> {
  const registry = createDefaultRegistry();
  const llmProvider = createLlmProvider(registry);
  const botSendMessage = options.botSendMessage;

  // POST /api/tasks - Launch an autonomous task
  fastify.post<{ Body: { prompt: string; userId?: string; orbiter?: string } }>('/api/tasks', async (req, reply) => {
    const { prompt, userId = 'pilot', orbiter = 'scout' } = req.body || {};

    if (!prompt || prompt.trim() === '') {
      return reply.status(400).send({ error: 'Prompt is required' });
    }

    const db = getDatabase();
    const taskId = nanoid();
    const now = Date.now();

    db.prepare(`
      INSERT INTO tasks (id, user_id, prompt, status, orbiter, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `).run(taskId, userId, prompt.trim(), orbiter, now, now);

    // Launch ReAct engine in background
    globalReActEngine
      .runTask({
        taskId,
        userId,
        prompt: prompt.trim(),
        orbiter,
        registry,
        llmProvider,
        botSendMessage,
      })
      .catch((err) => {
        console.error(`Task ${taskId} encountered error:`, err);
      });

    return reply.status(201).send({
      taskId,
      status: 'pending',
      prompt: prompt.trim(),
      orbiter,
      createdAt: now,
    });
  });

  // GET /api/tasks - List recent tasks
  fastify.get<{ Querystring: { userId?: string; limit?: string } }>('/api/tasks', async (req, reply) => {
    const userId = req.query.userId || 'pilot';
    const limit = parseInt(req.query.limit || '20', 10);
    const db = getDatabase();

    const tasks = db
      .prepare(`SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(userId, limit);

    return reply.send({ tasks });
  });

  // GET /api/tasks/:id - Fetch task status and step history
  fastify.get<{ Params: { id: string } }>('/api/tasks/:id', async (req, reply) => {
    const { id } = req.params;
    const db = getDatabase();

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as any;
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    const steps = db
      .prepare(`SELECT * FROM execution_steps WHERE task_id = ? ORDER BY step_number ASC, created_at ASC`)
      .all(id) as any[];

    const pendingApproval = db
      .prepare(`SELECT * FROM pending_approvals WHERE task_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`)
      .get(id);

    return reply.send({
      task,
      steps: steps.map((s) => ({
        id: s.id,
        taskId: s.task_id,
        stepNumber: s.step_number,
        type: s.type,
        thought: s.thought,
        toolName: s.tool_name,
        toolInput: s.tool_input ? JSON.parse(s.tool_input) : null,
        toolOutput: s.tool_output,
        timestamp: s.created_at,
      })),
      pendingApproval: pendingApproval
        ? {
            id: (pendingApproval as any).id,
            toolName: (pendingApproval as any).tool_name,
            parameters: JSON.parse((pendingApproval as any).parameters),
            createdAt: (pendingApproval as any).created_at,
          }
        : null,
    });
  });

  // GET /api/tasks/:id/stream - Server-Sent Events real-time thought stream
  fastify.get<{ Params: { id: string } }>('/api/tasks/:id/stream', (req, reply) => {
    const { id } = req.params;
    const db = getDatabase();

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    // 1. Send all existing steps stored in database
    const existingSteps = db
      .prepare(`SELECT * FROM execution_steps WHERE task_id = ? ORDER BY step_number ASC, created_at ASC`)
      .all(id) as any[];

    for (const step of existingSteps) {
      const payload: AgentStepEvent = {
        taskId: step.task_id,
        stepNumber: step.step_number,
        type: step.type,
        thought: step.thought,
        toolName: step.tool_name,
        toolInput: step.tool_input ? JSON.parse(step.tool_input) : null,
        toolOutput: step.tool_output,
        timestamp: step.created_at,
      };
      reply.raw.write(`event: step\ndata: ${JSON.stringify(payload)}\n\n`);
    }

    // 2. Listen for live updates
    const onStep = (stepEvent: AgentStepEvent) => {
      reply.raw.write(`event: step\ndata: ${JSON.stringify(stepEvent)}\n\n`);
      if (stepEvent.type === 'FINAL_ANSWER' || stepEvent.type === 'ERROR') {
        reply.raw.write(`event: done\ndata: {"status":"finished"}\n\n`);
      }
    };

    globalReActEngine.on(`step:${id}`, onStep);

    // Keep-alive heartbeat interval every 15 seconds
    const heartbeat = setInterval(() => {
      reply.raw.write(`: heartbeat\n\n`);
    }, 15000);

    // Clean up when client disconnects
    req.raw.on('close', () => {
      clearInterval(heartbeat);
      globalReActEngine.off(`step:${id}`, onStep);
    });
  });

  // POST /api/tasks/:id/approve - Submit human approval or denial
  fastify.post<{ Params: { id: string }; Body: { approved: boolean } }>(
    '/api/tasks/:id/approve',
    async (req, reply) => {
      const { id } = req.params;
      const { approved } = req.body || {};

      const waiter = pendingApprovalWaiters.get(id);
      if (waiter) {
        waiter(Boolean(approved));
        return reply.send({ success: true, status: approved ? 'approved' : 'rejected' });
      }

      return reply.status(404).send({ error: 'No active approval waiter found for this task' });
    }
  );

  // GET /api/schedules - List background cron jobs
  fastify.get<{ Querystring: { userId?: string } }>('/api/schedules', async (req, reply) => {
    const userId = req.query.userId || 'pilot';
    const db = getDatabase();

    const jobs = db
      .prepare(`SELECT * FROM scheduled_jobs WHERE user_id = ? ORDER BY next_run_at ASC`)
      .all(userId);

    return reply.send({ jobs });
  });

  // POST /api/schedules - Register new background job
  fastify.post<{ Body: { name: string; cron_expression: string; prompt: string; userId?: string } }>(
    '/api/schedules',
    async (req, reply) => {
      const { name, cron_expression, prompt, userId = 'pilot' } = req.body || {};

      if (!name || !cron_expression || !prompt) {
        return reply.status(400).send({ error: 'Missing name, cron_expression, or prompt' });
      }

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
        `).run(jobId, userId, name, cron_expression, prompt, nextRunAt, now);

        return reply.status(201).send({
          jobId,
          name,
          cron_expression,
          nextRunAt: nextDate.toISOString(),
        });
      } catch (err: any) {
        return reply.status(400).send({ error: `Invalid cron expression: ${err.message}` });
      }
    }
  );

  // PATCH /api/schedules/:id/toggle - Toggle active status
  fastify.patch<{ Params: { id: string } }>('/api/schedules/:id/toggle', async (req, reply) => {
    const { id } = req.params;
    const db = getDatabase();

    const job = db.prepare(`SELECT is_active FROM scheduled_jobs WHERE id = ?`).get(id) as any;
    if (!job) {
      return reply.status(404).send({ error: 'Schedule not found' });
    }

    const newActive = job.is_active ? 0 : 1;
    db.prepare(`UPDATE scheduled_jobs SET is_active = ? WHERE id = ?`).run(newActive, id);

    return reply.send({ id, isActive: newActive === 1 });
  });

  // DELETE /api/schedules/:id - Delete a scheduled job
  fastify.delete<{ Params: { id: string } }>('/api/schedules/:id', async (req, reply) => {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare(`DELETE FROM scheduled_jobs WHERE id = ?`).run(id);
    return reply.send({ success: true });
  });

  // GET /api/memory - List all stored memory items
  fastify.get<{ Querystring: { userId?: string } }>('/api/memory', async (req, reply) => {
    const userId = req.query.userId || 'pilot';
    const db = getDatabase();

    const memory = db
      .prepare(`SELECT * FROM agent_memory WHERE user_id = ? ORDER BY updated_at DESC`)
      .all(userId);

    return reply.send({ memory });
  });

  // GET /api/memory/search - FTS5 full-text search across agent memory
  fastify.get<{ Querystring: { q?: string; userId?: string } }>('/api/memory/search', async (req, reply) => {
    const query = (req.query.q || '').trim();
    const userId = req.query.userId || 'pilot';

    if (!query) {
      return reply.send({ results: [], count: 0, query: '' });
    }

    const results = searchMemoryFts(userId, query);
    return reply.send({ results, count: results.length, query });
  });

  // POST /api/tasks/:id/replay - Re-run or branch an execution
  fastify.post<{ Params: { id: string }; Body?: { prompt?: string; orbiter?: string; userId?: string } }>(
    '/api/tasks/:id/replay',
    async (req, reply) => {
      const { id } = req.params;
      const db = getDatabase();
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;

      if (!existing) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      const newTaskId = nanoid();
      const prompt = (req.body?.prompt || existing.prompt).trim();
      const orbiter = req.body?.orbiter || existing.orbiter || 'scout';
      const userId = req.body?.userId || existing.user_id || 'pilot';
      const now = Date.now();

      db.prepare(`
        INSERT INTO tasks (id, user_id, prompt, status, orbiter, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?)
      `).run(newTaskId, userId, prompt, orbiter, now, now);

      globalReActEngine
        .runTask({
          taskId: newTaskId,
          userId,
          prompt,
          orbiter,
          registry,
          llmProvider,
          botSendMessage,
        })
        .catch((err) => {
          console.error(`Task ${newTaskId} replay error:`, err);
        });

      return reply.status(201).send({
        taskId: newTaskId,
        originalTaskId: id,
        status: 'pending',
        prompt,
        orbiter,
        createdAt: now,
      });
    }
  );

  // DELETE /api/memory/:key - Delete a memory item
  fastify.delete<{ Params: { key: string }; Querystring: { userId?: string } }>(
    '/api/memory/:key',
    async (req, reply) => {
      const { key } = req.params;
      const userId = req.query.userId || 'pilot';
      const db = getDatabase();

      db.prepare(`DELETE FROM agent_memory WHERE user_id = ? AND key = ?`).run(userId, key);
      return reply.send({ success: true });
    }
  );
}
