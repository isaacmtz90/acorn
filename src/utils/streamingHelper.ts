import { App } from "@slack/bolt";
import { logger } from "./logger";
import aiService from "../services/aiService";

// Helper function to get emoji for citation type
const getCitationEmoji = (citationType: string): string => {
  switch (citationType) {
    case "s3": return "📄";
    case "web": return "🌐";
    case "confluence": return "📝";
    case "salesforce": return "⚡";
    case "sharepoint": return "📊";
    case "kendra": return "🔍";
    default: return "📋";
  }
};

// Helper function to process streaming chunks
const processStreamChunk = (chunk: any): { text: string; citations: any[] | null } => {
  if (typeof chunk === "string") {
    return { text: chunk, citations: null };
  }

  if (typeof chunk === "object") {
    if (chunk.type === "text") {
      return { text: chunk.content, citations: null };
    }
    if (chunk.type === "citations") {
      return { text: "", citations: chunk.content as any[] };
    }
    if (chunk.type === "complete") {
      return { text: "", citations: null };
    }
  }

  return { text: "", citations: null };
};

// Helper function to update Slack message
const updateSlackMessage = async (
  app: App,
  channel: string,
  messageTs: string | undefined,
  text: string,
  threadTs: string
) => {
  await app.client.chat.update({
    token: process.env.SLACK_BOT_TOKEN,
    channel,
    ts: messageTs,
    text,
    thread_ts: threadTs,
  });
};

// Helper function to format citations
const formatCitations = (citations: any[]): string => {
  let citationsText = "\n\n📚 *Sources:*\n";
  citations.forEach((citation, index) => {
    const typeEmoji = getCitationEmoji(citation.type);
    citationsText += `${index + 1}. ${typeEmoji} ${citation.title}\n   ${citation.uri}\n`;
  });
  return citationsText;
};

// Helper function to handle streaming error
const handleStreamingError = async (
  app: App,
  event: any,
  messageTs: string | undefined,
  error: Error
) => {
  logger.error("Error in streaming:", error);
  await updateSlackMessage(
    app,
    event.channel,
    messageTs,
    `❌ <@${event.user}> Error during streaming: ${error.message}`,
    event.ts
  );
};

/**
 * Handle streaming AI responses with real-time updates
 */
export const handleStreamingResponse = async (
  question: string,
  event: any,
  app: App,
  prefix: string = "",
  knowledgeBaseId?: string
): Promise<void> => {
  const initialMessage = await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: event.channel,
    text: `${prefix}*tail twitching with anticipation* 🐿️`,
    thread_ts: event.ts,
  });

  const options = knowledgeBaseId ? { knowledgeBaseId } : {};
  const result = await aiService.stream(question, event.user, event.channel, options);

  if (!result.success) {
    await updateSlackMessage(
      app,
      event.channel,
      initialMessage.ts,
      `❌ <@${event.user}> ${result.response}`,
      event.ts
    );
    return;
  }

  try {
    const { fullResponse, citations } = await processStreamingResponse(
      result.stream,
      app,
      event,
      initialMessage.ts,
      prefix
    );

    const finalResponse = citations.length > 0
      ? fullResponse + formatCitations(citations)
      : fullResponse;

    await updateSlackMessage(app, event.channel, initialMessage.ts, `${prefix}${finalResponse}`, event.ts);

    const sourceInfo = result.stream?.source === "agent" ? " (with knowledge base)" : " (direct model)";
    logger.info(`Stream for ${event.user}: ${fullResponse.length} chars${sourceInfo}, ${citations.length} citations`);
  } catch (streamError) {
    await handleStreamingError(app, event, initialMessage.ts, streamError as Error);
  }
};

// Helper function to process the entire stream
const processStreamingResponse = async (
  stream: any,
  app: App,
  event: any,
  messageTs: string | undefined,
  prefix: string
): Promise<{ fullResponse: string; citations: any[] }> => {
  let fullResponse = "";
  let citations: any[] = [];
  let lastUpdate = Date.now();
  const updateInterval = 2000;

  if (!stream) {
    return { fullResponse, citations };
  }

  for await (const chunk of stream.textStream) {
    const { text, citations: newCitations } = processStreamChunk(chunk);

    if (text) {
      fullResponse += text;
    }

    if (newCitations) {
      citations = newCitations;
      logger.info(`Stream received ${citations.length} citations`);
    }

    if (chunk?.type === "complete") {
      break;
    }

    if (Date.now() - lastUpdate > updateInterval) {
      await updateSlackMessage(
        app,
        event.channel,
        messageTs,
        `${prefix}${fullResponse}...`,
        event.ts
      );
      lastUpdate = Date.now();
    }
  }

  if (citations.length > 0) {
    logger.info(`Added ${citations.length} citations to streaming response`);
  }

  return { fullResponse, citations };
};