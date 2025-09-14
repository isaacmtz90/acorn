import { App } from "@slack/bolt";
import * as dotenv from "dotenv";

import { registerMessageHandlers } from "./handlers/messageHandler";
import { registerEventHandlers } from "./handlers/eventHandler";
import { registerAiHandlers } from "./handlers/aiHandler";
import { registerMentionHandlers } from "./handlers/mentionHandler";

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: parseInt(process.env.PORT || "3000", 10),
});

registerMessageHandlers(app);
registerEventHandlers(app);
registerAiHandlers(app);
registerMentionHandlers(app);

// Debug: Log all events (remove this after debugging)
app.event(/.+/, async ({ event }) => {
  console.log("📨 EVENT RECEIVED:", event.type, {
    user: (event as any).user,
    channel: (event as any).channel,
    text: (event as any).text?.substring(0, 50),
  });
});

app.error(async (error) => {
  console.error("Bot error:", error);
});

(async (): Promise<void> => {
  try {
    await app.start();
    console.log("⚡️ Acorn Slack bot is running!");
  } catch (error) {
    console.error("Failed to start bot:", error);
  }
})();
