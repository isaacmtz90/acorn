import { App } from "@slack/bolt";
import { logger } from "../utils/logger";
import aiService from "../services/aiService";
import * as responses from "../utils/responses";

// Helper function to get emoji for citation type
const getCitationEmoji = (citationType: string): string => {
  switch (citationType) {
    case "s3":
      return "📄";
    case "web":
      return "🌐";
    case "confluence":
      return "📝";
    case "salesforce":
      return "⚡";
    case "sharepoint":
      return "📊";
    case "kendra":
      return "🔍";
    default:
      return "📋";
  }
};

// Helper function to handle streaming AI responses
const handleStreamingResponse = async (
  question: string,
  event: any,
  app: App,
  prefix: string = ""
): Promise<void> => {
  const initialMessage = await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: event.channel,
    text: `${prefix}*tail twitching with anticipation* 🐿️`,
    thread_ts: event.ts,
  });

  const result = await aiService.stream(question, event.user, event.channel);

  if (!result.success) {
    await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: event.channel,
      ts: initialMessage.ts,
      text: `❌ <@${event.user}> ${result.response}`,
      thread_ts: event.ts,
    });
    return;
  }

  let fullResponse = "";
  let citations: any[] = [];
  let lastUpdate = Date.now();
  const updateInterval = 2000;

  try {
    if (result.stream) {
      for await (const chunk of result.stream.textStream) {
        if (typeof chunk === "string") {
          fullResponse += chunk;
        } else if (typeof chunk === "object") {
          if (chunk.type === "text") {
            fullResponse += chunk.content;
          } else if (chunk.type === "citations") {
            citations = chunk.content as any[];
            logger.info(`Mention stream received ${citations.length} citations`);
          } else if (chunk.type === "complete") {
            break;
          }
        }

        if (Date.now() - lastUpdate > updateInterval) {
          await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: event.channel,
            ts: initialMessage.ts,
            text: `${prefix}${fullResponse}...`,
            thread_ts: event.ts,
          });
          lastUpdate = Date.now();
        }
      }
    }

    let finalResponse = fullResponse;
    if (citations.length > 0) {
      finalResponse += "\n\n📚 *Sources:*\n";
      citations.forEach((citation, index) => {
        const typeEmoji = getCitationEmoji(citation.type);
        finalResponse += `${index + 1}. ${typeEmoji} ${citation.title}\n   ${citation.uri}\n`;
      });
      logger.info(`Added ${citations.length} citations to mention streaming response`);
    }

    await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: event.channel,
      ts: initialMessage.ts,
      text: `${prefix}${finalResponse}`,
      thread_ts: event.ts,
    });

    const sourceInfo = result.stream?.source === "agent" ? " (with knowledge base)" : " (direct model)";
    logger.info(`Mention stream for ${event.user}: ${fullResponse.length} chars${sourceInfo}, ${citations.length} citations`);
  } catch (streamError) {
    logger.error("Error in mention stream:", streamError);
    await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: event.channel,
      ts: initialMessage.ts,
      text: `❌ <@${event.user}> Error during streaming: ${(streamError as Error).message}`,
      thread_ts: event.ts,
    });
  }
};

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