import { App } from "@slack/bolt";
import { logger } from "../utils/logger";

export function registerMessageHandlers(app: App): void {
  app.message("hello", async ({ message, say }) => {
    try {
      if ("user" in message && "ts" in message) {
        await say({
          text: `*pokes head up from behind an acorn* Hello <@${message.user}>! 🐿️🌰`,
          thread_ts: message.ts,
        });
        logger.info(`Responded to hello from user ${message.user}`);
      }
    } catch (error) {
      logger.error("Error in hello message handler:", error);
    }
  });

  app.message(/help/i, async ({ message, say }) => {
    try {
      if ("user" in message && "ts" in message) {
        const helpText = `
*chittering helpfully* 🐿️ Here's what this squirrel can do!

🌰 *Just Chat With Me!*
• \`hello\` - I'll wave my tiny paw!
• \`help\` - This helpful list!
• \`ask: question\` - Ask me anything!
• \`ask kb1: question\` - Search my special nut storage!
• \`stream: question\` - Watch me think out loud!
• \`status\` - Check if I'm still alive!
• \`info\` - My technical specs!

🥜 *Or Just Mention Me!*
• \`@acorn your question\` - I love attention!
• \`@acorn status\` - How am I doing?
• \`@acorn stream: tell me about trees\` - Real-time thoughts!

*tail wagging* No fancy commands needed - just talk to me naturally! 🌳
        `;
        await say({
          text: helpText,
          thread_ts: message.ts,
        });
        logger.info(`Provided help to user ${message.user}`);
      }
    } catch (error) {
      logger.error("Error in help message handler:", error);
    }
  });

  app.message(async ({ message }) => {
    if ("text" in message && "user" in message && message.text) {
      if (
        !message.text.includes("hello") &&
        !message.text.toLowerCase().includes("help")
      ) {
        logger.info(`Received message from ${message.user}: ${message.text}`);
      }
    }
  });
}