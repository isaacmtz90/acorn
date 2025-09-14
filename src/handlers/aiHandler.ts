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
  message: any,
  app: App,
  prefix: string = "",
  knowledgeBaseId?: string
): Promise<void> => {
  const initialMessage = await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: message.channel,
    text: `${prefix}*tail twitching with anticipation* 🐿️`,
    thread_ts: message.ts,
  });

  const options = knowledgeBaseId ? { knowledgeBaseId } : {};
  const result = await aiService.stream(question, message.user, message.channel, options);

  if (!result.success) {
    await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: message.channel,
      ts: initialMessage.ts,
      text: `❌ ${result.response}`,
      thread_ts: message.ts,
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
            logger.info(`Stream received ${citations.length} citations`);
          } else if (chunk.type === "complete") {
            break;
          }
        }

        if (Date.now() - lastUpdate > updateInterval) {
          await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: message.channel,
            ts: initialMessage.ts,
            text: `${prefix}${fullResponse}...`,
            thread_ts: message.ts,
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
      logger.info(`Added ${citations.length} citations to streaming response`);
    }

    await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: message.channel,
      ts: initialMessage.ts,
      text: `${prefix}${finalResponse}`,
      thread_ts: message.ts,
    });

    const sourceInfo = result.stream?.source === "agent" ? " (with knowledge base)" : " (direct model)";
    logger.info(`Stream for ${message.user}: ${fullResponse.length} chars${sourceInfo}, ${citations.length} citations`);
  } catch (streamError) {
    logger.error("Error in streaming:", streamError);
    await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: message.channel,
      ts: initialMessage.ts,
      text: `❌ Error during streaming: ${(streamError as Error).message}`,
      thread_ts: message.ts,
    });
  }
};

export function registerAiHandlers(app: App): void {
  // Handle "ask:" pattern - now streaming by default
  app.message(/^ask:\s*(.*)/i, async ({ message, say }) => {
    try {
      const text = "text" in message ? message.text : "";
      const question = text?.replace(/^ask:\s*/i, "").trim();

      if (!question) {
        await say({
          text: responses.askEmptyResponse,
          thread_ts: "ts" in message ? message.ts : undefined,
        });
        return;
      }

      const prefix = responses.askSuccessPrefix(true); // Assume KB usage since aiService handles fallback
      await handleStreamingResponse(question, message, app, prefix);

      if ("user" in message) {
        logger.info(`Ask query from ${message.user}: "${question}" - Streaming response`);
      }
    } catch (error) {
      logger.error("Error in ask handler:", error);
      await say({
        text: "Sorry, I encountered an error while processing your question.",
        thread_ts: "ts" in message ? message.ts : undefined,
      });
    }
  });

  // Handle "ask kb1:" pattern for specific knowledge base streaming
  app.message(/^ask\s+kb(\d+):\s*(.*)/i, async ({ message, say }) => {
    try {
      const text = "text" in message ? message.text : "";
      const matches = text?.match(/^ask\s+kb(\d+):\s*(.*)/i);
      if (!matches) return;

      const kbIndex = parseInt(matches[1]);
      const question = matches[2].trim();

      const knowledgeBaseId = aiService.getKnowledgeBaseId(kbIndex);

      if (!knowledgeBaseId) {
        await say({
          text: responses.kbNotFoundResponse(kbIndex, aiService.knowledgeBaseIds.length),
          thread_ts: "ts" in message ? message.ts : undefined,
        });
        return;
      }

      if (!question) {
        await say({
          text: responses.kbEmptyQuestionResponse(kbIndex),
          thread_ts: "ts" in message ? message.ts : undefined,
        });
        return;
      }

      const prefix = `*diving into knowledge nut collection #${kbIndex}* 🥜 `;
      await handleStreamingResponse(question, message, app, prefix, knowledgeBaseId);

      if ("user" in message) {
        logger.info(`KB${kbIndex} query from ${message.user}: "${question}" - Streaming response`);
      }
    } catch (error) {
      logger.error("Error in KB query handler:", error);
      await say({
        text: "Sorry, I encountered an error while searching the knowledge base.",
        thread_ts: "ts" in message ? message.ts : undefined,
      });
    }
  });

  // Note: app_mention is now handled in mentionHandler.js
}