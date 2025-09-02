const { App } = require("@slack/bolt");
require("dotenv").config();

const messageHandler = require("./handlers/messageHandler");
const eventHandler = require("./handlers/eventHandler");
const aiHandler = require("./handlers/aiHandler");
const mentionHandler = require("./handlers/mentionHandler");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});

messageHandler(app);
eventHandler(app);
aiHandler(app);
mentionHandler(app);

// Debug: Log all events (remove this after debugging)
app.event(/.+/, async ({ event }) => {
  console.log("📨 EVENT RECEIVED:", event.type, {
    user: event.user,
    channel: event.channel,
    text: event.text?.substring(0, 50),
  });
});

app.error(async (error) => {
  console.error("Bot error:", error);
});

(async () => {
  try {
    await app.start();
    console.log("⚡️ Acorn Slack bot is running!");
  } catch (error) {
    console.error("Failed to start bot:", error);
  }
})();
