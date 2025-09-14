import { App } from "@slack/bolt";
import { logger } from "../utils/logger";
import { memberJoinedResponse } from "../utils/responses";

export function registerEventHandlers(app: App): void {
  // Note: app_mention is handled in aiHandler.js

  app.event("member_joined_channel", async ({ event, say }) => {
    try {
      await say(memberJoinedResponse(event.user));
      logger.info(`New member joined: ${event.user}`);
    } catch (error) {
      logger.error("Error handling member joined:", error);
    }
  });

  app.event("reaction_added", async ({ event }) => {
    try {
      logger.info(`Reaction added: ${event.reaction} by ${event.user}`);
    } catch (error) {
      logger.error("Error handling reaction added:", error);
    }
  });
}