import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export interface TaskRecord {
  id: string;
  user_id: string;
  prompt: string;
  status: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed';
  result?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ExecutionStepRecord {
  id: string;
  task_id: string;
  step_number: number;
  type: 'THOUGHT' | 'ACTION' | 'OBSERVATION' | 'FINAL_ANSWER' | 'SYSTEM' | 'ERROR';
  thought?: string | null;
  tool_name?: string | null;
  tool_input?: string | null;
  tool_output?: string | null;
  created_at: number;
}

export interface MemoryRecord {
  id: string;
  user_id: string;
  key: string;
  value: string;
  updated_at: number;
}

export interface ScheduledJobRecord {
  id: string;
  user_id: string;
  name: string;
  cron_expression: string;
  prompt: string;
  is_active: number;
  last_run_at?: number | null;
  next_run_at: number;
  created_at: number;
}

export interface PendingApprovalRecord {
  id: string;
  task_id: string;
  tool_name: string;
  parameters: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: number;
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(dbPath?: string): DatabaseSync {
  if (dbInstance) {
    if (!dbPath) {
      return dbInstance;
    }
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }

  const targetPath = dbPath || process.env.DATABASE_PATH || 'data/agentorbit.db';
  const resolvedDir = path.dirname(path.resolve(targetPath));

  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS execution_steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      type TEXT NOT NULL,
      thought TEXT,
      tool_name TEXT,
      tool_input TEXT,
      tool_output TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_steps_task ON execution_steps(task_id, step_number ASC);

    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, key)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_user_key ON agent_memory(user_id, key);

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      prompt TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      next_run_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_active_next ON scheduled_jobs(is_active, next_run_at);

    CREATE TABLE IF NOT EXISTS pending_approvals (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      parameters TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_approvals_task ON pending_approvals(task_id, status);
  `);

  dbInstance = db;
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
