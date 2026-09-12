import { Bot, InlineKeyboard } from 'grammy';
import { run } from '@grammyjs/runner';
import { nanoid } from 'nanoid';
import { getDatabase } from '../db/database.js';
import { globalReActEngine, pendingApprovalWaiters } from '../agent/loop.js';
import { createDefaultRegistry } from '../agent/tools/registry.js';
import { createLlmProvider } from '../agent/llmAdapter.js';

export function setupTelegramBot(appPublicUrl: string): {
  bot: Bot | null;
  startPolling: () => void;
  stopPolling: () => void;
  sendMessage: (chatId: string | number, text: string) => Promise<void>;
} {
  const token = process.env.TELEGRAM_BOT_TOKEN || 'mock_bot_token';
  const isMockToken = token === 'mock_bot_token' || token.startsWith('mock_');

  if (isMockToken) {
    console.log('🤖 Telegram Bot running in simulated DEMO_MODE (no external Telegram API connection required).');

    return {
      bot: null,
      startPolling: () => {
        console.log('ℹ️ Bot long-polling skipped for mock token. Mini App cockpit is fully interactive on HTTP port.');
      },
      stopPolling: () => {},
      sendMessage: async (chatId, text) => {
        console.log(`[Simulated Bot Message to ${chatId}]:\n${text}`);
      },
    };
  }

  const bot = new Bot(token);
  const registry = createDefaultRegistry();
  const llmProvider = createLlmProvider(registry);
  let runnerInstance: any = null;

  // /start command
  bot.command('start', async (ctx) => {
    const webAppUrl = `${appPublicUrl}/?userId=${ctx.from?.id || 'demo'}`;
    const keyboard = new InlineKeyboard()
      .webApp('⚡ Launch Cockpit', webAppUrl)
      .row()
      .text('📋 Action Blueprints', 'show_templates');

    await ctx.reply(
      `🛰️ *AgentOrbit Cockpit Initialized*\n\nWelcome! AgentOrbit is your autonomous execution engine inside Telegram.\n\n• *Autonomous Action Loops*: Executes multi-step goals with sandboxed tools.\n• *Live Thought Streaming*: Watch reasoning steps in real-time.\n• *Human-in-the-Loop*: Approvals for sensitive actions.\n• *Background Schedules*: 24/7 monitoring cron jobs.\n\nTap *Launch Cockpit* below to open the visual cockpit, or send any goal directly in this chat!`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // /templates command
  bot.command('templates', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('✈️ Flight Price Watcher', 'tpl_flight')
      .row()
      .text('📰 Hacker News AI Radar', 'tpl_hn')
      .row()
      .text('🔍 Website Diff Monitor', 'tpl_diff')
      .row()
      .text('🛡️ Webhook with Approval', 'tpl_approval');

    await ctx.reply(`⚡ *Select an Autonomous Action Blueprint:*`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  // /schedules command
  bot.command('schedules', async (ctx) => {
    const db = getDatabase();
    const userId = String(ctx.from?.id || 'anonymous');
    const jobs = db.prepare(`SELECT * FROM scheduled_jobs WHERE user_id = ? ORDER BY next_run_at ASC`).all(userId) as any[];

    if (jobs.length === 0) {
      await ctx.reply('No active background scheduled jobs. You can schedule jobs via the Mini App or chat.');
      return;
    }

    const text = jobs
      .map(
        (j) =>
          `• *${j.name}*\n  Cron: \`${j.cron_expression}\`\n  Next run: ${new Date(j.next_run_at).toLocaleString()}\n  Status: ${j.is_active ? '🟢 Active' : '⏸️ Paused'}`
      )
      .join('\n\n');

    await ctx.reply(`⏰ *Your Scheduled Automations:*\n\n${text}`, { parse_mode: 'Markdown' });
  });

  // /help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `📖 *AgentOrbit Commands:*\n\n/start - Open execution cockpit\n/templates - Preset agent blueprints\n/schedules - View background cron jobs\n/task <prompt> - Launch a background task\n/help - Show this guide\n\nYou can also type any objective directly in the chat to launch an autonomous task.`,
      { parse_mode: 'Markdown' }
    );
  });

  // /task command or direct chat prompt
  bot.command('task', async (ctx) => {
    const prompt = ctx.match?.trim();
    if (!prompt) {
      await ctx.reply('Please specify an objective. Example:\n`/task Monitor flight prices from Chișinău to London under $120`', {
        parse_mode: 'Markdown',
      });
      return;
    }
    await launchTaskFromChat(ctx, prompt, appPublicUrl, registry, llmProvider);
  });

  // Handle callback queries for approvals and blueprints
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    if (data.startsWith('approve_')) {
      const taskId = data.replace('approve_', '');
      const waiter = pendingApprovalWaiters.get(taskId);
      if (waiter) {
        waiter(true);
        await ctx.answerCallbackQuery({ text: 'Action approved! Resuming execution...' });
        await ctx.editMessageText(`✅ *Action Approved*. The agent has resumed execution.`, { parse_mode: 'Markdown' });
      } else {
        await ctx.answerCallbackQuery({ text: 'Approval request expired or already resolved.' });
      }
      return;
    }

    if (data.startsWith('deny_')) {
      const taskId = data.replace('deny_', '');
      const waiter = pendingApprovalWaiters.get(taskId);
      if (waiter) {
        waiter(false);
        await ctx.answerCallbackQuery({ text: 'Action denied. Tool execution skipped.' });
        await ctx.editMessageText(`❌ *Action Denied*. The agent skipped this tool call.`, { parse_mode: 'Markdown' });
      } else {
        await ctx.answerCallbackQuery({ text: 'Approval request expired or already resolved.' });
      }
      return;
    }

    if (data === 'show_templates') {
      const keyboard = new InlineKeyboard()
        .text('✈️ Flight Price Watcher', 'tpl_flight')
        .row()
        .text('📰 Hacker News AI Radar', 'tpl_hn')
        .row()
        .text('🔍 Website Diff Monitor', 'tpl_diff');
      await ctx.reply('Select a template to execute:', { reply_markup: keyboard });
      await ctx.answerCallbackQuery();
      return;
    }

    const templateMap: Record<string, string> = {
      tpl_flight: 'Monitor flight prices from Chișinău to London under $125',
      tpl_hn: 'Extract top AI announcements from Hacker News and summarize trends',
      tpl_diff: 'Inspect website status for breaking updates and schedule periodic diffs',
      tpl_approval: 'Prepare and dispatch outbound webhook payload with human clearance',
    };

    if (templateMap[data]) {
      await ctx.answerCallbackQuery({ text: 'Launching blueprint...' });
      await launchTaskFromChat(ctx, templateMap[data], appPublicUrl, registry, llmProvider);
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // Direct text messages from user
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return; // ignore unrecognized slash commands
    await launchTaskFromChat(ctx, text, appPublicUrl, registry, llmProvider);
  });

  return {
    bot,
    startPolling: () => {
      try {
        console.log('🤖 Starting Telegram Bot runner in long-polling mode...');
        runnerInstance = run(bot);
      } catch (err: any) {
        console.error('Failed to start Telegram Bot long polling:', err.message);
      }
    },
    stopPolling: () => {
      if (runnerInstance && runnerInstance.isRunning()) {
        runnerInstance.stop();
      }
    },
    sendMessage: async (chatId, text) => {
      await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    },
  };
}

async function launchTaskFromChat(
  ctx: any,
  prompt: string,
  appPublicUrl: string,
  registry: any,
  llmProvider: any
) {
  const db = getDatabase();
  const userId = String(ctx.from?.id || 'anonymous');
  const taskId = nanoid();
  const now = Date.now();

  db.prepare(`
    INSERT INTO tasks (id, user_id, prompt, status, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(taskId, userId, prompt, now, now);

  const webAppUrl = `${appPublicUrl}/?taskId=${taskId}&userId=${userId}`;
  const keyboard = new InlineKeyboard().webApp('⚡ Watch Execution Live', webAppUrl);

  await ctx.reply(
    `🤖 *Agent task dispatched!*\n\n*Objective:* "${prompt}"\n\nTap below to watch live thought steps and tool operations in the Mini App cockpit:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );

  // Run in background without blocking Telegram webhook
  globalReActEngine
    .runTask({
      taskId,
      userId,
      prompt,
      registry,
      llmProvider,
      botSendMessage: async (cid, msg) => {
        try {
          await ctx.api.sendMessage(cid, msg, { parse_mode: 'Markdown' });
        } catch (e: any) {
          console.error('Failed to deliver bot message:', e.message);
        }
      },
    })
    .then(async (result) => {
      try {
        await ctx.reply(`🏁 *Task Completed*\n\n${result}`, { parse_mode: 'Markdown' });
      } catch {}
    })
    .catch(async (err) => {
      try {
        await ctx.reply(`❌ *Task Failed*: ${err.message}`);
      } catch {}
    });
}
