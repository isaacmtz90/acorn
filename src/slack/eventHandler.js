const { logger } = require("../utils/logger");
const { handleStreamingResponse, sendMessage } = require("./responses");
const responses = require("../utils/responses");
const aiService = require("../services/aiService");

/**
 * Main event handler for HTTP-based Slack events
 * Replaces the Socket Mode event handling
 */
async function createEventHandler(body, context = {}) {
  const { requestId } = context;

  try {
    // Handle different event types
    switch (body.type) {
      case "event_callback":
        return await handleEventCallback(body.event, body, requestId);

      case "interactive_payload":
        return await handleInteractivePayload(body, requestId);

      case "slash_command":
        return await handleSlashCommand(body, requestId);

      default:
        logger.info(`Unhandled event type: ${body.type}`, { requestId });
        return { ok: true };
    }
  } catch (error) {
    logger.error("Error in event handler:", error, { requestId });
    return { error: "Internal server error" };
  }
}

/**
 * Handle Slack event callbacks (messages, mentions, etc.)
 */
async function handleEventCallback(event, body, requestId) {
  logger.info(`Processing event: ${event.type}`, {
    requestId,
    user: event.user,
    channel: event.channel,
  });

  switch (event.type) {
    case "message":
      return await handleMessage(event, requestId);

    case "app_mention":
      return await handleAppMention(event, requestId);

    case "member_joined_channel":
    case "member_left_channel":
      return await handleMemberEvent(event, requestId);

    case "reaction_added":
    case "reaction_removed":
      return await handleReactionEvent(event, requestId);

    default:
      logger.info(`Unhandled event type: ${event.type}`, { requestId });
      return { ok: true };
  }
}

/**
 * Handle direct messages and text pattern matching
 */
async function handleMessage(event, requestId) {
  // Skip bot messages and message changes
  if (event.bot_id || event.subtype === "message_changed") {
    return { ok: true };
  }

  const text = event.text?.trim();
  if (!text) return { ok: true };

  const channel = event.channel;
  const user = event.user;
  const threadTs = event.thread_ts || event.ts;

  logger.info(`Processing message: "${text}"`, { requestId, user, channel });

  try {
    // Handle "ask:" pattern
    if (/^ask:\s*(.+)/i.test(text)) {
      const question = text.replace(/^ask:\s*/i, "").trim();

      if (!question) {
        await sendMessage(channel, responses.askEmptyResponse, { threadTs });
        return { ok: true };
      }

      const prefix = responses.askSuccessPrefix(true);
      await handleStreamingResponse(question, channel, threadTs, user, prefix);
      return { ok: true };
    }

    // Handle "ask kb1:" pattern
    const kbMatch = text.match(/^ask\s+kb(\d+):\s*(.+)/i);
    if (kbMatch) {
      const kbIndex = parseInt(kbMatch[1]);
      const question = kbMatch[2].trim();

      const knowledgeBaseId = aiService.getKnowledgeBaseId(kbIndex);

      if (!knowledgeBaseId) {
        await sendMessage(
          channel,
          responses.kbNotFoundResponse(
            kbIndex,
            aiService.knowledgeBaseIds.length
          ),
          { threadTs }
        );
        return { ok: true };
      }

      if (!question) {
        await sendMessage(channel, responses.kbEmptyQuestionResponse(kbIndex), {
          threadTs,
        });
        return { ok: true };
      }

      const prefix = `*diving into knowledge nut collection #${kbIndex}* 🥜 `;
      await handleStreamingResponse(question, channel, threadTs, user, prefix);
      return { ok: true };
    }

    // Handle greetings in DMs
    if (
      event.channel_type === "im" &&
      /^(hi|hello|hey|howdy|good morning|good afternoon|good evening)/i.test(
        text
      )
    ) {
      const greeting = responses.getRandomGreeting(user);
      await sendMessage(channel, greeting, { threadTs });
      return { ok: true };
    }

    // Handle help requests in DMs
    if (
      event.channel_type === "im" &&
      /^(help|what can you do|commands|usage)/i.test(text)
    ) {
      const help = responses.getHelpResponse(user);
      await sendMessage(channel, help, { threadTs });
      return { ok: true };
    }

    return { ok: true };
  } catch (error) {
    logger.error("Error handling message:", error, { requestId });
    await sendMessage(
      channel,
      "Sorry, I encountered an error while processing your message.",
      { threadTs }
    );
    return { ok: true };
  }
}

/**
 * Handle app mentions (@acorn)
 */
async function handleAppMention(event, requestId) {
  const text = event.text.replace(/<@[UW][A-Z0-9]+>/g, "").trim();
  const channel = event.channel;
  const user = event.user;
  const threadTs = event.thread_ts || event.ts;

  logger.info(`Processing mention: "${text}"`, { requestId, user, channel });

  try {
    // Handle empty mentions
    if (!text || text.length < 2) {
      await sendMessage(channel, responses.getEmptyMentionResponse(user), {
        threadTs,
      });
      return { ok: true };
    }

    // Handle specific patterns
    if (
      /^(hi|hello|hey|howdy|good morning|good afternoon|good evening)/i.test(
        text
      )
    ) {
      const greeting = responses.getRandomGreeting(user);
      await sendMessage(channel, greeting, { threadTs });
      return { ok: true };
    }

    if (/^(help|what can you do|commands|usage)/i.test(text)) {
      const help = responses.getHelpResponse(user);
      await sendMessage(channel, help, { threadTs });
      return { ok: true };
    }

    if (/^(thank|thanks|thx|appreciate)/i.test(text)) {
      const thanks = responses.getRandomThankYou(user);
      await sendMessage(channel, thanks, { threadTs });
      return { ok: true };
    }

    if (/^(status|are you (working|online|up|alive)|health)/i.test(text)) {
      const uptime = process.uptime();
      const uptimeString = `${Math.floor(uptime / 60)} minutes ${Math.floor(
        uptime % 60
      )} seconds`;
      const aiStatus = aiService.getStatus();

      const status = responses.getStatusResponse(user, aiStatus, uptimeString);
      await sendMessage(channel, status, { threadTs });
      return { ok: true };
    }

    if (/^(info|config|configuration|ai info|brain|setup)/i.test(text)) {
      const aiStatus = aiService.getStatus();
      const kbList =
        aiService.knowledgeBaseIds.length > 0
          ? aiService.knowledgeBaseIds
              .map(
                (id, i) =>
                  `${i + 1}. ${id.substring(0, 8)}...${id.substring(
                    id.length - 4
                  )}`
              )
              .join("\n")
          : "No knowledge bases configured";

      const info = responses.getInfoResponse(user, aiStatus, kbList);
      await sendMessage(channel, info, { threadTs });
      return { ok: true };
    }

    // Default: Stream AI response
    const prefix = responses.getRandomThinkingPrefix(user);
    await handleStreamingResponse(text, channel, threadTs, user, prefix);
    return { ok: true };
  } catch (error) {
    logger.error("Error handling mention:", error, { requestId });
    await sendMessage(
      channel,
      `<@${user}> Sorry, I encountered an error while processing your message.`,
      { threadTs }
    );
    return { ok: true };
  }
}

/**
 * Handle member join/leave events
 */
async function handleMemberEvent(event, requestId) {
  logger.info(`Member event: ${event.type}`, {
    requestId,
    user: event.user,
    channel: event.channel,
  });

  try {
    if (event.type === "member_joined_channel") {
      const welcomeMessage = `*scampers excitedly* 🐿️ Welcome to the channel <@${event.user}>! I'm Acorn, your friendly AI assistant! Feel free to ask me anything or just say hi! 🌰`;
      await sendMessage(event.channel, welcomeMessage);
    }

    return { ok: true };
  } catch (error) {
    logger.error("Error handling member event:", error, { requestId });
    return { ok: true };
  }
}

/**
 * Handle reaction events
 */
async function handleReactionEvent(event, requestId) {
  logger.info(`Reaction event: ${event.type}`, {
    requestId,
    reaction: event.reaction,
    user: event.user,
  });

  try {
    // React back to squirrel-related reactions
    if (
      ["🐿️", "🌰", "🥜", "chestnut", "squirrel"].includes(event.reaction) &&
      event.type === "reaction_added"
    ) {
      // Add a reaction back (this would need the reactions:write scope)
      logger.info("Squirrel reaction detected - could react back");
    }

    return { ok: true };
  } catch (error) {
    logger.error("Error handling reaction:", error, { requestId });
    return { ok: true };
  }
}

/**
 * Handle interactive payloads (buttons, select menus, etc.)
 */
async function handleInteractivePayload(body, requestId) {
  logger.info("Interactive payload received", { requestId });
  // Future: handle button clicks, select menus, etc.
  return { ok: true };
}

/**
 * Handle slash commands
 */
async function handleSlashCommand(body, requestId) {
  logger.info(`Slash command: ${body.command}`, { requestId });

  try {
    if (body.command === "/acorn-ask") {
      const question = body.text?.trim();

      if (!question) {
        return {
          response_type: "ephemeral",
          text: responses.askEmptyResponse,
        };
      }

      // Start streaming response
      const prefix = responses.askSuccessPrefix(true);
      await handleStreamingResponse(
        question,
        body.channel_id,
        null,
        body.user_id,
        prefix
      );

      return {
        response_type: "in_channel",
        text: `*scurries up thinking tree* 🌳 Processing your question: "${question}"...`,
      };
    }

    return { ok: true };
  } catch (error) {
    logger.error("Error handling slash command:", error, { requestId });
    return {
      response_type: "ephemeral",
      text: "Sorry, I encountered an error while processing your command.",
    };
  }
}

module.exports = {
  createEventHandler,
};
