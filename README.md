# Telegram MCP Bridge

An MCP server that lets Claude Code send messages and ask questions via Telegram.

When Claude Code needs your input during a coding task, it sends a Telegram message (with optional inline buttons) and waits for your reply.

```
Claude Code → MCP tool call → this server → Telegram Bot API → your phone
           ← tool result    ← server      ← you tap a button / type a reply
```

## Tools

| Tool | Description |
|------|-------------|
| `ask_user` | Send a question with optional buttons, wait for response (10-min timeout) |
| `notify_user` | Fire-and-forget notification |

## Setup

### 1. Create a Telegram Bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`, follow prompts — save the **bot token**
3. Message your new bot (send anything), then visit:
   ```
   https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
   ```
4. Find your **chat ID** in the response JSON (`result[0].message.chat.id`)

### 2. Clone & Install

```bash
git clone https://github.com/yourusername/telegram-claude-mcp.git
cd telegram-claude-mcp
npm install
```

### 3. Configure Claude Code

Add to `~/.claude/mcp.json` (create the file if it doesn't exist):

```json
{
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["/absolute/path/to/telegram-claude-mcp/telegram-bridge.js"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "your-bot-token",
        "TELEGRAM_CHAT_ID": "your-chat-id"
      }
    }
  }
}
```

### 4. Restart Claude Code

The MCP server starts automatically when Claude Code launches. You should see `telegram` in your MCP server list.

## Usage

Claude Code will automatically have access to `ask_user` and `notify_user` tools. You can prompt it to use them:

> "If you need to ask me something, use the ask_user Telegram tool"

Or Claude may use them when configured in your project's `CLAUDE.md`.

## License

MIT
