const aiService = require("../services/aiService");
const { logger } = require("../utils/logger");

// Helper function to get emoji for citation type
const getCitationEmoji = (citationType) => {
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

// Helper function to try knowledge base first, then fallback to general query
const queryWithKnowledgeBasePriority = async (question, userId, channelId) => {
  logger.info(
    `[AI HANDLER] Starting query processing for user ${userId}: "${question}"`
  );

  // Try each knowledge base in order
  if (aiService.knowledgeBaseIds && aiService.knowledgeBaseIds.length > 0) {
    logger.info(
      `[AI HANDLER] Found ${aiService.knowledgeBaseIds.length} knowledge bases, trying each in order`
    );

    for (let i = 0; i < aiService.knowledgeBaseIds.length; i++) {
      const kbId = aiService.knowledgeBaseIds[i];
      logger.info(
        `[AI HANDLER] Querying knowledge base ${i + 1}/${
          aiService.knowledgeBaseIds.length
        }: ${kbId}`
      );

      const result = await aiService.query(question, userId, channelId, {
        knowledgeBaseId: kbId,
      });
      // If we got a successful response, return it
      if (result.success) {
        logger.info(
          `[AI HANDLER] ✅ Knowledge base ${
            i + 1
          } (${kbId}) provided successful answer (${
            result.response?.length || 0
          } chars)`
        );
        logger.info(
          `[AI HANDLER] Citations: ${
            result.citations ? result.citations.length : 0
          } sources found`
        );
        return {
          ...result,
          source: `knowledge base ${i + 1}`,
          knowledgeBaseUsed: kbId,
        };
      } else {
        logger.info(
          `[AI HANDLER] ❌ Knowledge base ${i + 1} (${kbId}) failed: ${
            result.error || "No response"
          }`
        );
      }
    }

    logger.info(
      `[AI HANDLER] All ${aiService.knowledgeBaseIds.length} knowledge bases failed, falling back to general AI query`
    );
  } else {
    logger.info(
      "[AI HANDLER] No knowledge bases configured, using general AI directly"
    );
  }

  // Fallback to general query if no KB or KB didn't work
  logger.info(`[AI HANDLER] Executing fallback general AI query`);
  const result = await aiService.query(question, userId, channelId);

  if (result.success) {
    logger.info(
      `[AI HANDLER] ✅ General AI provided successful answer (${
        result.response?.length || 0
      } chars)`
    );
  } else {
    logger.error(
      `[AI HANDLER] ❌ General AI query also failed: ${
        result.error || "No response"
      }`
    );
  }

  return {
    ...result,
    source: "general AI",
    knowledgeBaseUsed: null,
  };
};

// Helper function to handle AI responses
const handleResponse = async (result, say, message, prefix = "") => {
  const responseText = result.success
    ? `${prefix}${result.response}`
    : `❌ ${result.response}`;

  await say({
    text: responseText,
    thread_ts: message.ts,
  });
};

// Helper function for streaming updates
const updateStreamingMessage = async (
  app,
  channel,
  ts,
  text,
  threadTs,
  isComplete = false
) => {
  const prefix = isComplete ? "✅ *Complete:*\n" : "🔄 *Streaming:*\n";
  await app.client.chat.update({
    token: process.env.SLACK_BOT_TOKEN,
    channel,
    ts,
    text: `${prefix}${text}${isComplete ? "" : "..."}`,
    thread_ts: threadTs,
  });
};

module.exports = (app) => {
  // Handle "ask:" pattern
  app.message(/^ask:\s*(.*)/i, async ({ message, say }) => {
    try {
      const question = message.text.replace(/^ask:\s*/i, "").trim();

      if (!question) {
        await say({
          text: "*tilts head* You said \"ask:\" but then... *looks around confused* ...where's the question? Try: `ask: What's the best way to store acorns?` 🐿️",
          thread_ts: message.ts,
        });
        return;
      }

      await say({
        text: "*scurries up thinking tree* 🌳 Let me check my nut collection first, then think...",
        thread_ts: message.ts,
      });

      const result = await queryWithKnowledgeBasePriority(
        question,
        message.user,
        message.channel
      );

      // Add squirrel personality based on source
      const sourcePrefix = result.knowledgeBaseUsed
        ? `*chittering proudly while holding acorn* Found it in my special nut storage! 🥜 `
        : `*scratches head thoughtfully* Hmm, not in my acorn collection, but I figured it out anyway! 🐿️ `;

      await handleResponse(result, say, message, sourcePrefix);

      logger.info(
        `Ask query from ${message.user}: "${question}" - ${
          result.success ? "Success" : "Failed"
        } (Source: ${result.source})`
      );
    } catch (error) {
      logger.error("Error in ask handler:", error);
      await say({
        text: "Sorry, I encountered an error while processing your question.",
        thread_ts: message.ts,
      });
    }
  });

  // Handle "ask kb1:" pattern for knowledge bases
  app.message(/^ask\s+kb(\d+):\s*(.*)/i, async ({ message, say }) => {
    try {
      const matches = message.text.match(/^ask\s+kb(\d+):\s*(.*)/i);
      const kbIndex = parseInt(matches[1]);
      const question = matches[2].trim();

      logger.info(
        `[AI HANDLER - KB SPECIFIC] Direct KB query request for KB${kbIndex} from user ${message.user}: "${question}"`
      );

      const knowledgeBaseId = aiService.getKnowledgeBaseId(kbIndex);

      if (!knowledgeBaseId) {
        logger.warn(
          `[AI HANDLER - KB SPECIFIC] ❌ Invalid KB index ${kbIndex} (only ${aiService.knowledgeBaseIds.length} KBs available)`
        );
        await say({
          text: `*rummages through acorn collection* ❌ Hmm, I don't have knowledge nut #${kbIndex} in my collection! I only have ${aiService.knowledgeBaseIds.length} special nuts stored away! 🥜`,
          thread_ts: message.ts,
        });
        return;
      }

      if (!question) {
        logger.warn(
          `[AI HANDLER - KB SPECIFIC] ❌ Empty question for KB${kbIndex}`
        );
        await say({
          text: "*chittering excitedly* You want to search my special nut collection but... what should I look for? Try: `ask kb1: Where are the best acorn recipes?` 🐿️",
          thread_ts: message.ts,
        });
        return;
      }

      logger.info(
        `[AI HANDLER - KB SPECIFIC] Querying specific KB${kbIndex} (${knowledgeBaseId})`
      );
      await say({
        text: `*diving into knowledge nut collection #${kbIndex}* 🥜 Let me dig through my special storage...`,
        thread_ts: message.ts,
      });

      const result = await aiService.query(
        question,
        message.user,
        message.channel,
        { knowledgeBaseId }
      );

      if (result.success) {
        logger.info(
          `[AI HANDLER - KB SPECIFIC] ✅ KB${kbIndex} query successful (${
            result.response?.length || 0
          } chars)`
        );
        logger.info(
          `[AI HANDLER - KB SPECIFIC] Citations: ${
            result.citations ? result.citations.length : 0
          } sources found`
        );
      } else {
        logger.error(
          `[AI HANDLER - KB SPECIFIC] ❌ KB${kbIndex} query failed: ${
            result.error || "No response"
          }`
        );
      }

      await handleResponse(result, say, message, `📚 *KB #${kbIndex}:*\n`);

      logger.info(
        `[AI HANDLER - KB SPECIFIC] Completed KB${kbIndex} query from ${message.user}`
      );
    } catch (error) {
      logger.error("Error in KB query handler:", error);
      await say({
        text: "Sorry, I encountered an error while searching the knowledge base.",
        thread_ts: message.ts,
      });
    }
  });

  // Handle "stream:" pattern
  app.message(/^stream:\s*(.*)/i, async ({ message, say }) => {
    try {
      const question = message.text.replace(/^stream:\s*/i, "").trim();

      if (!question) {
        await say({
          text: "*gets excited about streaming but realizes there's no question* 🐿️ You want to see me think out loud but... about what? Try: `stream: How do acorns grow?`",
          thread_ts: message.ts,
        });
        return;
      }

      const initialMessage = await say({
        text: "*cracks knuckles* 🌰 Ooh, streaming! Watch my squirrel brain work!",
        thread_ts: message.ts,
      });
      const result = await aiService.stream(
        question,
        message.user,
        message.channel
      );

      if (!result.success) {
        await updateStreamingMessage(
          app,
          message.channel,
          initialMessage.ts,
          result.response,
          message.ts,
          true
        );
        return;
      }

      let fullResponse = "";
      let citations = [];
      let lastUpdate = Date.now();
      const updateInterval = 2000;

      try {
        for await (const chunk of result.stream.textStream) {
          // Handle different types of chunks from the stream
          if (typeof chunk === "string") {
            // Direct model stream - just text
            fullResponse += chunk;
          } else if (typeof chunk === "object") {
            // Agent stream - structured chunks
            if (chunk.type === "text") {
              fullResponse += chunk.content;
            } else if (chunk.type === "citations") {
              citations = chunk.content;
              logger.info(`Stream received ${citations.length} citations`);
            } else if (chunk.type === "complete") {
              // Final chunk - we have everything
              break;
            }
          }

          if (Date.now() - lastUpdate > updateInterval) {
            await updateStreamingMessage(
              app,
              message.channel,
              initialMessage.ts,
              fullResponse,
              message.ts
            );
            lastUpdate = Date.now();
          }
        }

        // Format final response with citations if available
        let finalResponse = fullResponse;
        if (citations.length > 0) {
          finalResponse += "\n\n📚 *Sources:*\n";
          citations.forEach((citation, index) => {
            const typeEmoji = getCitationEmoji(citation.type);
            finalResponse += `${index + 1}. ${typeEmoji} ${
              citation.title
            }\n   ${citation.uri}\n`;
          });
          logger.info(
            `Added ${citations.length} citations to streaming response`
          );
        }

        await updateStreamingMessage(
          app,
          message.channel,
          initialMessage.ts,
          finalResponse,
          message.ts,
          true
        );

        const sourceInfo =
          result.stream.source === "agent"
            ? " (with knowledge base)"
            : " (direct model)";
        logger.info(
          `Streamed response for ${message.user}: ${fullResponse.length} chars${sourceInfo}, ${citations.length} citations`
        );
      } catch (streamError) {
        logger.error("Error processing stream:", streamError);
        await updateStreamingMessage(
          app,
          message.channel,
          initialMessage.ts,
          `Error: ${streamError.message}`,
          message.ts,
          true
        );
      }
    } catch (error) {
      logger.error("Error in stream handler:", error);
      await say({
        text: "Sorry, I encountered an error while processing your streaming request.",
        thread_ts: message.ts,
      });
    }
  });

  // Handle "stream kb1:" pattern for knowledge base streaming
  app.message(/^stream\s+kb(\d+):\s*(.*)/i, async ({ message, say }) => {
    try {
      const matches = message.text.match(/^stream\s+kb(\d+):\s*(.*)/i);
      const kbIndex = parseInt(matches[1]);
      const question = matches[2].trim();

      logger.info(
        `[AI HANDLER - KB STREAM] Direct KB streaming request for KB${kbIndex} from user ${message.user}: "${question}"`
      );

      const knowledgeBaseId = aiService.getKnowledgeBaseId(kbIndex);

      if (!knowledgeBaseId) {
        logger.warn(
          `[AI HANDLER - KB STREAM] ❌ Invalid KB index ${kbIndex} (only ${aiService.knowledgeBaseIds.length} KBs available)`
        );
        await say({
          text: `*rummages through streaming acorn collection* ❌ Hmm, I don't have streaming nut #${kbIndex} in my collection! I only have ${aiService.knowledgeBaseIds.length} special streaming nuts stored away! 🥜`,
          thread_ts: message.ts,
        });
        return;
      }

      if (!question) {
        logger.warn(
          `[AI HANDLER - KB STREAM] ❌ Empty question for KB${kbIndex} stream`
        );
        await say({
          text: "*chittering excitedly while preparing for streaming* You want to watch me search my special nut collection but... what should I stream about? Try: `stream kb1: How do acorns grow?` 🐿️",
          thread_ts: message.ts,
        });
        return;
      }

      logger.info(
        `[AI HANDLER - KB STREAM] Starting specific KB${kbIndex} stream (${knowledgeBaseId})`
      );
      const initialMessage = await say({
        text: `*diving into streaming knowledge nut collection #${kbIndex}* 🥜 Watch me dig through my special storage in real-time...`,
        thread_ts: message.ts,
      });

      const result = await aiService.stream(
        question,
        message.user,
        message.channel,
        { knowledgeBaseId }
      );

      if (!result.success) {
        await updateStreamingMessage(
          app,
          message.channel,
          initialMessage.ts,
          result.response,
          message.ts,
          true
        );
        return;
      }

      let fullResponse = "";
      let citations = [];
      let lastUpdate = Date.now();
      const updateInterval = 2000;

      try {
        for await (const chunk of result.stream.textStream) {
          // Handle different types of chunks from the stream
          if (typeof chunk === "string") {
            // Direct model stream - just text
            fullResponse += chunk;
          } else if (typeof chunk === "object") {
            // Agent stream - structured chunks
            if (chunk.type === "text") {
              fullResponse += chunk.content;
            } else if (chunk.type === "citations") {
              citations = chunk.content;
              logger.info(
                `KB${kbIndex} stream received ${citations.length} citations`
              );
            } else if (chunk.type === "complete") {
              // Final chunk - we have everything
              break;
            }
          }

          if (Date.now() - lastUpdate > updateInterval) {
            await updateStreamingMessage(
              app,
              message.channel,
              initialMessage.ts,
              fullResponse,
              message.ts
            );
            lastUpdate = Date.now();
          }
        }

        // Format final response with citations if available
        let finalResponse = fullResponse;
        if (citations.length > 0) {
          finalResponse += "\n\n📚 *Sources:*\n";
          citations.forEach((citation, index) => {
            const typeEmoji = getCitationEmoji(citation.type);
            finalResponse += `${index + 1}. ${typeEmoji} ${
              citation.title
            }\n   ${citation.uri}\n`;
          });
          logger.info(
            `Added ${citations.length} citations to KB${kbIndex} streaming response`
          );
        }

        await updateStreamingMessage(
          app,
          message.channel,
          initialMessage.ts,
          finalResponse,
          message.ts,
          true
        );

        logger.info(
          `[AI HANDLER - KB STREAM] ✅ Completed KB${kbIndex} stream from ${message.user}: ${fullResponse.length} chars, ${citations.length} citations`
        );
      } catch (streamError) {
        logger.error("Error in KB stream:", streamError);
        await updateStreamingMessage(
          app,
          message.channel,
          initialMessage.ts,
          `Error: ${streamError.message}`,
          message.ts,
          true
        );
      }
    } catch (error) {
      logger.error("Error in KB stream handler:", error);
      await say({
        text: "Sorry, I encountered an error while processing your KB streaming request.",
        thread_ts: message.ts,
      });
    }
  });

  // Note: app_mention is now handled in mentionHandler.js
};
