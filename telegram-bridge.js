import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import TelegramBot from "node-telegram-bot-api";

// --- Config ---

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error(
    "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables"
  );
  process.exit(1);
}

const ASK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// --- Telegram Bot ---

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Track the single pending ask_user request
let pendingResolve = null;

bot.on("message", (msg) => {
  if (String(msg.chat.id) !== String(CHAT_ID)) return;
  if (!pendingResolve) return;
  // Ignore messages that are just button-press notifications
  if (msg.text === undefined) return;

  const resolve = pendingResolve;
  pendingResolve = null;
  resolve(msg.text);
});

bot.on("callback_query", async (query) => {
  if (String(query.message.chat.id) !== String(CHAT_ID)) return;

  // Acknowledge the button press to remove loading state
  await bot.answerCallbackQuery(query.id);

  if (!pendingResolve) return;

  const resolve = pendingResolve;
  pendingResolve = null;
  resolve(query.data);
});

bot.on("polling_error", (err) => {
  console.error("Telegram polling error:", err.message);
});

// --- MCP Server ---

const server = new McpServer({
  name: "telegram-bridge",
  version: "1.0.0",
});

server.registerTool(
  "ask_user",
  {
    title: "Ask User via Telegram",
    description:
      "Send a question to the user via Telegram and wait for their response. " +
      "Optionally include inline buttons for quick replies. " +
      "Times out after 10 minutes.",
    inputSchema: {
      message: z.string().describe("The question or message to send"),
      buttons: z
        .array(z.string())
        .optional()
        .describe(
          "Optional list of button labels for quick replies (inline keyboard)"
        ),
    },
  },
  async ({ message, buttons }) => {
    const opts = { parse_mode: "Markdown" };

    if (buttons && buttons.length > 0) {
      opts.reply_markup = {
        inline_keyboard: [
          buttons.map((label) => ({
            text: label,
            callback_data: label,
          })),
        ],
      };
    }

    await bot.sendMessage(CHAT_ID, message, opts);

    // Wait for user response
    const response = await new Promise((resolve, reject) => {
      pendingResolve = resolve;

      setTimeout(() => {
        if (pendingResolve === resolve) {
          pendingResolve = null;
          reject(new Error("Timed out waiting for user response (10 min)"));
        }
      }, ASK_TIMEOUT_MS);
    });

    return {
      content: [{ type: "text", text: response }],
    };
  }
);

server.registerTool(
  "notify_user",
  {
    title: "Notify User via Telegram",
    description:
      "Send a notification message to the user via Telegram. " +
      "Does not wait for a response.",
    inputSchema: {
      message: z.string().describe("The notification message to send"),
    },
  },
  async ({ message }) => {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: "Markdown" });
    return {
      content: [{ type: "text", text: "Notification sent." }],
    };
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Telegram MCP bridge running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
