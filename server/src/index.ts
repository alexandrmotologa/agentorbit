import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { getDatabase, closeDatabase } from './db/database.js';
import { setupTelegramBot } from './bot/bot.js';
import { taskRoutes } from './routes/taskApi.js';
import { globalReActEngine } from './agent/loop.js';
import { createDefaultRegistry } from './agent/tools/registry.js';
import { createLlmProvider } from './agent/llmAdapter.js';
import { nanoid } from 'nanoid';
import { CronExpressionParser } from 'cron-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const PORT = parseInt(process.env.PORT || '8090', 10);
const HOST = '0.0.0.0';
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || `http://localhost:${PORT}`;

async function bootstrap() {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'warn',
    },
  });

  // Enable CORS
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Initialize SQLite database
  const db = getDatabase();
  console.log('📦 SQLite database initialized in WAL mode.');

  // Initialize Telegram Bot
  const telegram = setupTelegramBot(APP_PUBLIC_URL);
  telegram.startPolling();

  // Register API routes
  await server.register(taskRoutes, {
    botSendMessage: telegram.sendMessage,
  });

  // Serve compiled React frontend
  // Look in ../public (production Docker) or ../../web/dist (local build)
  const candidatePaths = [
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(process.cwd(), 'web/dist'),
  ];

  let staticRoot = candidatePaths.find((p) => fs.existsSync(p));

  if (staticRoot) {
    console.log(`🌐 Serving static Mini App bundle from: ${staticRoot}`);
    await server.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
    });

    // SPA fallback
    server.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'API endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    server.get('/', async (req, reply) => {
      return reply.send({
        service: 'AgentOrbit Autonomous Cockpit & Engine',
        status: 'online',
        port: PORT,
        demoMode: process.env.DEMO_MODE === 'true',
        frontend: 'Vite dev server running separately on :5173 or run "npm run build" in web/',
      });
    });
  }

  // Background cron scheduler tick worker
  const schedulerInterval = setInterval(async () => {
    try {
      const now = Date.now();
      const dueJobs = db
        .prepare(`SELECT * FROM scheduled_jobs WHERE is_active = 1 AND next_run_at <= ?`)
        .all(now) as any[];

      for (const job of dueJobs) {
        console.log(`⏰ Triggering scheduled job "${job.name}" (${job.id})...`);
        const taskId = nanoid();

        db.prepare(`
          INSERT INTO tasks (id, user_id, prompt, status, created_at, updated_at)
          VALUES (?, ?, ?, 'pending', ?, ?)
        `).run(taskId, job.user_id, `[Scheduled: ${job.name}] ${job.prompt}`, now, now);

        // Compute next run date
        let nextRunAt = now + 3600 * 1000;
        try {
          const interval = CronExpressionParser.parse(job.cron_expression);
          nextRunAt = interval.next().toDate().getTime();
        } catch {}

        db.prepare(`UPDATE scheduled_jobs SET last_run_at = ?, next_run_at = ? WHERE id = ?`).run(
          now,
          nextRunAt,
          job.id
        );

        const registry = createDefaultRegistry();
        const llmProvider = createLlmProvider(registry);

        globalReActEngine
          .runTask({
            taskId,
            userId: job.user_id,
            prompt: job.prompt,
            registry,
            llmProvider,
            botSendMessage: telegram.sendMessage,
          })
          .catch((e) => console.error(`Scheduled task error:`, e));
      }
    } catch (err: any) {
      console.error('Error in background scheduler tick:', err.message);
    }
  }, 10000);

  // Graceful shutdown
  const cleanup = async () => {
    console.log('\n🛑 Shutting down AgentOrbit...');
    clearInterval(schedulerInterval);
    telegram.stopPolling();
    closeDatabase();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 AgentOrbit server operational on http://localhost:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
