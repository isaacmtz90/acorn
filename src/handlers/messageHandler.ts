import { App } from "@slack/bolt";
import { logger } from "../utils/logger";
import { helloResponse, messageHelpResponse } from "../utils/responses";

export function registerMessageHandlers(app: App): void {
  app.message("hello", async ({ message, say }) => {
    try {
      if ("user" in message && "ts" in message) {
        await say({
          text: helloResponse(message.user),
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
        await say({
          text: messageHelpResponse,
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