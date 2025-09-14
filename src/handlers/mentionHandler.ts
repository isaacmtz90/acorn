import { App } from "@slack/bolt";
import { logger } from "../utils/logger";
import aiService from "../services/aiService";
import * as responses from "../utils/responses";
import { handleStreamingResponse } from "../utils/streamingHelper";

export function registerMentionHandlers(app: App): void {
  app.event("app_mention", async ({ event, say }) => {
    console.log("🎯 MENTION RECEIVED:", {
      user: event.user,
      channel: event.channel,
      text: event.text,
      type: event.type,
      subtype: event.subtype,
    });

    try {
      const text = event.text?.replace(/<@[UW][A-Z0-9]+>/g, "").trim() || "";

      // Handle empty mentions
      if (!text || text.length < 2) {
        await say({
          text: responses.getEmptyMentionResponse(event.user),
          thread_ts: event.ts,
        });
        return;
      }

      // Greetings
      if (/^(hi|hello|hey|howdy|good morning|good afternoon|good evening)/i.test(text)) {
        await say({
          text: responses.getRandomGreeting(event.user),
          thread_ts: event.ts,
        });
        return;
      }

      // Help requests
      if (/^(help|what can you do|commands|usage)/i.test(text)) {
        await say({
          text: responses.getHelpResponse(event.user),
          thread_ts: event.ts,
        });
        return;
      }

      // Thank you responses
      if (/^(thank|thanks|thx|appreciate)/i.test(text)) {
        await say({
          text: responses.getRandomThankYou(event.user),
          thread_ts: event.ts,
        });
        return;
      }

      // Status/health checks
      if (/^(status|are you (working|online|up|alive)|health)/i.test(text)) {
        const uptime = process.uptime();
        const uptimeString = `${Math.floor(uptime / 60)} minutes ${Math.floor(uptime % 60)} seconds`;
        const aiStatus = aiService.getStatus();

        await say({
          text: responses.getStatusResponse(event.user, aiStatus, uptimeString),
          thread_ts: event.ts,
        });
        return;
      }

      // AI info/configuration requests
      if (/^(info|config|configuration|ai info|brain|setup)/i.test(text)) {
        const aiStatus = aiService.getStatus();
        const kbList = aiService.knowledgeBaseIds.length > 0
          ? aiService.knowledgeBaseIds
              .map((id, i) => `${i + 1}. ${id.substring(0, 8)}...${id.substring(id.length - 4)}`)
              .join("\n")
          : "No knowledge bases configured";

        await say({
          text: responses.getInfoResponse(event.user, aiStatus, kbList),
          thread_ts: event.ts,
        });
        return;
      }

      // Default: All other mentions become streaming AI queries
      const prefix = responses.getRandomThinkingPrefix(event.user);
      await handleStreamingResponse(text, event, app, prefix);

      logger.info(`Enhanced mention from ${event.user}: "${text}" - Streaming response`);
    } catch (error) {
      logger.error("Error in enhanced mention handler:", error);
      await say({
        text: `<@${event.user}> Sorry, I encountered an error while processing your message.`,
        thread_ts: event.ts,
      });
    }
  });
}