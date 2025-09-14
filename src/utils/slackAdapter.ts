import { App } from "@slack/bolt";
import { logger } from "../utils/logger";
import { registerEventHandlers } from "../handlers/eventHandler";
import { registerMessageHandlers } from "../handlers/messageHandler";
import { registerMentionHandlers } from "../handlers/mentionHandler";
import { registerAiHandlers } from "../handlers/aiHandler";

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
    registerAiHandlers(app);

    logger.info("All Slack handlers initialized successfully");
  } catch (error) {
    logger.error("Error initializing Slack handlers:", error);
    throw error;
  }
}

/**
 * Process Slack event using the Bolt app
 */
export async function processSlackEvent(
  app: App,
  body: any,
  context: {
    awsRequestId: string;
    functionName: string;
    getRemainingTimeInMillis: () => number;
  }
): Promise<void> {
  try {
    // For Lambda, we need to manually process the event
    const event = body.event;

    if (body.type === "event_callback" && event) {
      logger.info(`Processing Slack event: ${event.type}`);

      // Process different event types
      await processEventByType(app, event, body);
    }

    logger.info("Slack event processed successfully");
  } catch (error) {
    logger.error("Error processing Slack event:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Slack event processing failed: ${errorMessage}`);
  }
}

/**
 * Process events by type
 */
async function processEventByType(
  app: App,
  event: any,
  body: any
): Promise<void> {
  const baseContext = {
    event,
    client: app.client,
    body,
    payload: body,
  };

  const say = async (message: any) => {
    await app.client.chat.postMessage({
      channel: event.channel,
      ...message,
    });
  };

  switch (event.type) {
    case "app_mention":
      await processAppMentionHandlers(app, { ...baseContext });
      break;
    case "message":
      await processMessageHandlers(app, {
        ...baseContext,
        message: event,
        say,
      });
      break;
    default:
      await processGenericEventHandlers(app, event.type, {
        ...baseContext,
        say,
      });
      break;
  }
}

/**
 * Process app mention handlers
 */
async function processAppMentionHandlers(
  app: App,
  context: any
): Promise<void> {
  const handlers = (app as any)._listeners.filter(
    (listener: any) =>
      listener.type === "event" && listener.name === "app_mention"
  );

  for (const handler of handlers) {
    try {
      await handler.func(context);
    } catch (handlerError) {
      logger.error("Error in app_mention handler:", handlerError);
    }
  }
}

/**
 * Process message handlers
 */
async function processMessageHandlers(app: App, context: any): Promise<void> {
  const handlers = (app as any)._listeners.filter(
    (listener: any) => listener.type === "message"
  );

  for (const handler of handlers) {
    try {
      await handler.func(context);
    } catch (handlerError) {
      logger.error("Error in message handler:", handlerError);
    }
  }
}

/**
 * Process generic event handlers
 */
async function processGenericEventHandlers(
  app: App,
  eventType: string,
  context: any
): Promise<void> {
  const handlers = (app as any)._listeners.filter(
    (listener: any) => listener.type === "event" && listener.name === eventType
  );

  for (const handler of handlers) {
    try {
      await handler.func(context);
    } catch (handlerError) {
      logger.error(`Error in ${eventType} handler:`, handlerError);
    }
  }
}
