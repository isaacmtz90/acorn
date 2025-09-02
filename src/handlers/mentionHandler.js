const aiService = require("../services/aiService");
const { logger } = require("../utils/logger");

// Helper function to try knowledge base first, then fallback to general query
const queryWithKnowledgeBasePriority = async (question, userId, channelId) => {
  logger.info(
    `[MENTION HANDLER] Starting query processing for user ${userId}: "${question}"`
  );

  // Try each knowledge base in order
  if (aiService.knowledgeBaseIds && aiService.knowledgeBaseIds.length > 0) {
    logger.info(
      `[MENTION HANDLER] Found ${aiService.knowledgeBaseIds.length} knowledge bases, trying each in order`
    );

    for (let i = 0; i < aiService.knowledgeBaseIds.length; i++) {
      const kbId = aiService.knowledgeBaseIds[i];
      logger.info(
        `[MENTION HANDLER] Querying knowledge base ${i + 1}/${
          aiService.knowledgeBaseIds.length
        }: ${kbId}`
      );

      const result = await aiService.query(question, userId, channelId, {
        knowledgeBaseId: kbId,
      });

      // If we got a successful response, return it
      if (result.success) {
        logger.info(
          `[MENTION HANDLER] ✅ Knowledge base ${
            i + 1
          } (${kbId}) provided successful answer (${
            result.response?.length || 0
          } chars)`
        );
        logger.info(
          `[MENTION HANDLER] Citations: ${
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
          `[MENTION HANDLER] ❌ Knowledge base ${i + 1} (${kbId}) failed: ${
            result.error || "No response"
          }`
        );
      }
    }

    logger.info(
      `[MENTION HANDLER] All ${aiService.knowledgeBaseIds.length} knowledge bases failed, falling back to general AI query`
    );
  } else {
    logger.info(
      "[MENTION HANDLER] No knowledge bases configured, using general AI directly"
    );
  }

  // Fallback to general query if no KB or KB didn't work
  logger.info(`[MENTION HANDLER] Executing fallback general AI query`);
  const result = await aiService.query(question, userId, channelId);

  if (result.success) {
    logger.info(
      `[MENTION HANDLER] ✅ General AI provided successful answer (${
        result.response?.length || 0
      } chars)`
    );
  } else {
    logger.error(
      `[MENTION HANDLER] ❌ General AI query also failed: ${
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
const handleResponse = async (result, say, event, prefix = "") => {
  const responseText = result.success
    ? `${prefix}${result.response}`
    : `❌ ${result.response}`;

  await say({
    text: responseText,
    thread_ts: event.ts,
  });
};

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

module.exports = (app) => {
  // Enhanced mention handler with pattern matching
  app.event("app_mention", async ({ event, say }) => {
    console.log("🎯 MENTION RECEIVED:", {
      user: event.user,
      channel: event.channel,
      text: event.text,
      type: event.type,
      subtype: event.subtype,
    });
    try {
      const text = event.text.replace(/<@[UW][A-Z0-9]+>/g, "").trim();

      // Pattern-based responses

      // 1. Greetings
      if (
        /^(hi|hello|hey|howdy|good morning|good afternoon|good evening)/i.test(
          text
        )
      ) {
        const greetings = [
          `*scampers over quickly* Oh hi <@${event.user}>! 🐿️ I was just... ooh is that a shiny thing over there? No wait, focus Acorn, focus! How can I help you? *tail swish*`,
          `*pokes head up from behind a tree* Hello <@${event.user}>! 🌰 I was organizing my acorns by... wait, what were we talking about? OH RIGHT! What do you need?`,
          `*chittering happily* Hey there <@${event.user}>! 🐿️ Ready to help! Just let me finish this one thing... or maybe that other thing... okay I'm listening now!`,
        ];
        await say({
          text: greetings[Math.floor(Math.random() * greetings.length)],
          thread_ts: event.ts,
        });
        return;
      }

      // 2. Help requests
      if (/^(help|what can you do|commands|usage)/i.test(text)) {
        await say({
          text: `*stops mid-leap between branches* Oh! <@${event.user}> wants to know what I can do! 🐿️\n\n*organizing acorns while talking*\n\n🌰 **I can help with questions!** (Got distracted by a bird... where was I?)\n• Mention me with anything - I'll figure it out!\n• \`ask: question\` - for when you want answers\n• \`ask kb1: question\` - I know where the good nuts... I mean knowledge is stored!\n• \`stream: question\` - watch me think! It's entertaining!\n• \`status\` - check if I'm working (spoiler: probably!)\n• \`info\` - my brain configuration details\n\n🐿️ **Just talk naturally!** No fancy slash commands needed anymore - I understand regular chat! *tail swishing proudly*`,
          thread_ts: event.ts,
        });
        return;
      }

      // 3. Thank you responses
      if (/^(thank|thanks|thx|appreciate)/i.test(text)) {
        const thanks = [
          `*preens proudly* Aww, you're welcome <@${event.user}>! 🐿️ Now where did I put that acorn... *gets distracted rummaging*`,
          `*happy chittering* That's what I'm here for <@${event.user}>! 🌰 Helping humans is almost as fun as collecting nuts!`,
          `*tail wagging* Anytime <@${event.user}>! I do my best work when... ooh is that a new notification? Focus, Acorn! You're welcome! 🥜`,
        ];
        await say({
          text: thanks[Math.floor(Math.random() * thanks.length)],
          thread_ts: event.ts,
        });
        return;
      }

      // 4. Status/health checks
      if (/^(status|are you (working|online|up|alive)|health)/i.test(text)) {
        const uptime = process.uptime();
        const uptimeString = `${Math.floor(uptime / 60)} minutes ${Math.floor(
          uptime % 60
        )} seconds`;
        const aiStatus = aiService.getStatus();

        await say({
          text: `*scurries around checking things with tiny clipboard* <@${
            event.user
          }> 📋🐿️

🌰 *Acorn's Status Report*
• Am I working? ${
            aiStatus.initialized ? "✅ Like a busy squirrel!" : "❌ Uh oh..."
          }
• Been running for: ${uptimeString} *(That's a lot of nut-gathering time!)*
• My brain runs on: ${process.version} *(Fancy computer stuff!)*
• AI Model: ${aiStatus.modelId} *(My thinking acorn! 🌰)*
• RetrieveAndGenerate: ${
            aiStatus.agentConfigured ? "✅ Available!" : "❌ Not configured"
          }
• Tree Location: ${aiStatus.region} *(My server tree!)*
• Knowledge Nuts Stored: ${aiStatus.knowledgeBases} 🥜

*tail wagging* Everything looks good to me!`,
          thread_ts: event.ts,
        });
        return;
      }

      // 5. AI info/configuration requests
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

        await say({
          text: `*adjusts tiny glasses and shuffles through acorn notes* <@${event.user}> 📚🐿️

🌰 *Acorn's Brain Configuration*

*My Thinking Setup:* *(This is the technical stuff!)*
• My Brain Model: ${aiStatus.modelId} *(Very smart, like a super-nut!)*
• RetrieveAndGenerate: ${aiStatus.retrieveAndGenerate} *(For knowledge base queries!)*
• My Tree Location: ${aiStatus.region} *(Where I live in the cloud!)*

*My Knowledge Nut Collection:* 🥜
${kbList}

*How to Talk to Me:* *(I love all of these!)*
• \`ask: your question\` - Just ask me anything!
• \`ask kb1: question\` - I'll check my special nut storage!
• \`@acorn your question\` - Mention me! I love attention!
• \`stream: question\` - Watch me think out loud!

*chittering excitedly* That's everything! Any questions? 🌳`,
          thread_ts: event.ts,
        });
        return;
      }

      // 6. Stream request detection
      if (/^(stream|streaming|give me a stream)/i.test(text)) {
        // Check if it's a knowledge base stream request
        const kbMatch = text.match(/^stream\s+kb(\d+):\s*(.*)/i);
        let question, knowledgeBaseId, kbIndex;

        if (kbMatch) {
          // Knowledge base streaming
          kbIndex = parseInt(kbMatch[1]);
          question = kbMatch[2].trim();
          knowledgeBaseId = aiService.getKnowledgeBaseId(kbIndex);

          if (!knowledgeBaseId) {
            await say({
              text: `*rummages through streaming acorn collection* ❌ <@${event.user}> Hmm, I don't have streaming nut #${kbIndex} in my collection! I only have ${aiService.knowledgeBaseIds.length} special streaming nuts stored away! 🥜`,
              thread_ts: event.ts,
            });
            return;
          }

          if (!question) {
            await say({
              text: `*chittering excitedly while preparing for streaming* <@${event.user}> You want to watch me search my special nut collection but... what should I stream about? Try: \`@acorn stream kb1: How do acorns grow?\` 🐿️`,
              thread_ts: event.ts,
            });
            return;
          }
        } else {
          // Regular streaming
          question = text
            .replace(/^(stream|streaming|give me a stream)\s*/i, "")
            .trim();

          if (!question) {
            await say({
              text: `*tilts head curiously* <@${event.user}> wants me to stream something but... *gets distracted by a butterfly outside* ...wait what were we streaming? Oh! You need to tell me WHAT to stream! Try: \`@acorn stream explain quantum physics\` 🐿️`,
              thread_ts: event.ts,
            });
            return;
          }
        }

        const streamType = knowledgeBaseId
          ? `knowledge nut collection #${kbIndex}`
          : "my thinking tree";
        const initialMessage = await say({
          text: `*cracks knuckles excitedly* 🐿️ <@${event.user}> Ooh streaming from ${streamType}! Watch me think out loud! This is gonna be good... *tail twitching with anticipation*`,
          thread_ts: event.ts,
        });
        // Handle empty mentions
        if (!text || text.length < 2) {
          await say({
            text: `*chittering excitedly* Oh! Oh! <@${event.user}>! 🐿️ You called me? I was just... wait, was I organizing my nut collection or debugging code? Both? Anyway! \n\n*tail twitching* Here's what I can help with:\n• \`ask: your question\` - I'll find the answer! Eventually!\n• \`stream: question\` - Watch me think out loud!\n• \`/acorn-ask question\` - Ooh, fancy slash commands!\n• Or just mention me - I love getting mentioned! 🥜`,
            thread_ts: event.ts,
          });
          return;
        }
        const result = await aiService.stream(
          question,
          event.user,
          event.channel,
          knowledgeBaseId ? { knowledgeBaseId } : {}
        );

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
                  `Mention stream received ${citations.length} citations`
                );
              } else if (chunk.type === "complete") {
                // Final chunk - we have everything
                break;
              }
            }

            if (Date.now() - lastUpdate > updateInterval) {
              await app.client.chat.update({
                token: process.env.SLACK_BOT_TOKEN,
                channel: event.channel,
                ts: initialMessage.ts,
                text: `🔄 <@${event.user}> **Streaming:**\n${fullResponse}...`,
                thread_ts: event.ts,
              });
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
              `Added ${citations.length} citations to mention streaming response`
            );
          }

          await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: event.channel,
            ts: initialMessage.ts,
            text: `✅ <@${event.user}> **Complete:**\n${finalResponse}`,
            thread_ts: event.ts,
          });

          const sourceInfo =
            result.stream.source === "agent"
              ? " (with knowledge base)"
              : " (direct model)";
          logger.info(
            `Mention stream for ${event.user}: ${fullResponse.length} chars${sourceInfo}, ${citations.length} citations`
          );
        } catch (streamError) {
          logger.error("Error in mention stream:", streamError);
          await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: event.channel,
            ts: initialMessage.ts,
            text: `❌ <@${event.user}> Error during streaming: ${streamError.message}`,
            thread_ts: event.ts,
          });
        }
        return;
      }

      // 7. Default: Treat as AI query
      const thinkingMessages = [
        `*scratches head with tiny paw* 🐿️ <@${event.user}> Hmm, interesting question! Let me think... or maybe Google it... or ask my tree friends...`,
        `*drops acorn in surprise* Oh! <@${event.user}> That's a good one! *scurries up thinking tree* Give me a moment to figure this out...`,
        `*chittering thoughtfully* 🌰 <@${event.user}> You know what, I was JUST thinking about this! Well, not exactly this, but something similar! Let me focus...`,
      ];
      await say({
        text: thinkingMessages[
          Math.floor(Math.random() * thinkingMessages.length)
        ],
        thread_ts: event.ts,
      });

      const result = await queryWithKnowledgeBasePriority(
        text,
        event.user,
        event.channel
      );

      // Add squirrel personality to the response prefix based on source
      let responsePrefix;
      if (result.success) {
        if (result.knowledgeBaseUsed) {
          responsePrefix = `*chittering proudly while holding acorn* <@${event.user}> Found it in my special nut storage! 🥜 `;
        } else {
          responsePrefix = `*scratches head thoughtfully* <@${event.user}> Hmm, not in my acorn collection, but I figured it out anyway! 🐿️ `;
        }
      } else {
        responsePrefix = `*looks sheepish* <@${event.user}> Oops! 🥜 `;
      }

      await handleResponse(result, say, event, responsePrefix);

      logger.info(
        `Enhanced mention from ${event.user}: "${text}" - ${
          result.success ? "Success" : "Failed"
        }`
      );
    } catch (error) {
      logger.error("Error in enhanced mention handler:", error);
      await say({
        text: `<@${event.user}> Sorry, I encountered an error while processing your message.`,
        thread_ts: event.ts,
      });
    }
  });
};
