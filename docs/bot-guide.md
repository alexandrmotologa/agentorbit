# Telegram Bot & Mini App Configuration Guide

AgentOrbit includes a Telegram Bot built with the grammY framework (v1.x) that runs in Long Polling mode (`getUpdates`). You do not need to register a public webhook or provide an SSL certificate for local development.

---

## 1. Creating a Telegram Bot

1. Open Telegram and start a chat with [@BotFather](https://t.me/botfather).
2. Send `/newbot` and follow the prompts to choose a display name and username (e.g. `agentorbit_demo_bot`).
3. Copy the HTTP API token provided by BotFather.
4. Paste the token into your `.env` file:

```bash
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
```

---

## 2. Linking the Telegram Mini App

To allow users to launch the cockpit directly from the Telegram chat:

1. Open [@BotFather](https://t.me/botfather).
2. Send `/newapp` and select your bot.
3. Provide a title (e.g. `AgentOrbit Cockpit`) and a short description.
4. Upload an icon or app photo (you can use `docs/images/logo.png`).
5. When asked for the Web App URL, provide your hosted URL (or temporary tunnel like Cloudflare Tunnel if testing on a mobile device, or `http://localhost:8080` for Telegram Desktop / Web):

```
https://your-domain.com
```

6. To configure a dedicated menu button:
   - Send `/setmenubutton` to BotFather.
   - Select your bot.
   - Choose `Configure menu button`.
   - Enter the Mini App URL.

---

## 3. Bot Commands Reference

- `/start`: Displays an introduction card with an inline button to open the Mini App Cockpit.
- `/task <prompt>`: Dispatches an autonomous objective directly from the chat. The bot replies with an execution acknowledgment and an inline button to follow the reasoning stream.
- `/templates`: Presents four preset action blueprints:
  - Flight Price Watcher
  - Hacker News AI Radar
  - Website Diff Monitor
  - Webhook with Clearance
- `/schedules`: Displays all active background cron jobs for the current user.
- `/help`: Detailed operational instructions.

---

## 4. Chat-Based Human Clearance

When the agent attempts to run a tool marked `requiresApproval: true` (such as `http_post`), the bot sends an alert card directly into the Telegram chat with inline action buttons:

```
[ Approve Execution ]   [ Reject ]
```

The operator can approve the action either directly in the chat or through the Mini App modal sheet.
