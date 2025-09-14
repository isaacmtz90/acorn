import { App } from "@slack/bolt";
import { logger } from "./logger";
import { registerEventHandlers } from "../handlers/eventHandler";
import { registerMessageHandlers } from "../handlers/messageHandler";
import { registerMentionHandlers } from "../handlers/mentionHandler";

/**
 * Create and configure Slack Bolt app
 */
export function createSlackApp(): App {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    processBeforeResponse: true,
    socketMode: false, // We're using HTTP mode for Lambda
  });

  logger.info("Slack app created successfully");
  return app;
}

/**
 * Initialize all event handlers
 */
export async function initializeHandlers(app: App): Promise<void> {
  try {
    // Register all handlers
    registerEventHandlers(app);
    registerMessageHandlers(app);
    registerMentionHandlers(app);

    logger.info("All Slack handlers initialized successfully");
  } catch (error) {
    logger.error("Error initializing Slack handlers:", error);
    throw error;
  }
}

