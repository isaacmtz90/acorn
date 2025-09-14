const { logger } = require('../utils/logger');

/**
 * Send an async response to Slack using response_url
 * This allows us to send messages after the initial 3-second Lambda timeout
 */
async function sendAsyncResponse(responseUrl, message, options = {}) {
  try {
    const payload = {
      response_type: options.ephemeral ? 'ephemeral' : 'in_channel',
      text: message,
      replace_original: options.replace || false,
      delete_original: options.delete || false,
      ...options.blocks && { blocks: options.blocks }
    };

    const response = await fetch(responseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

    logger.info('Async response sent successfully');
    return true;
  } catch (error) {
    logger.error('Failed to send async response:', error);
    return false;
  }
}

/**
 * Update a message using the Web API (requires bot token)
 */
async function updateMessage(channel, timestamp, newText, options = {}) {
  try {
    const payload = {
      channel: channel,
      ts: timestamp,
      text: newText,
      ...options.blocks && { blocks: options.blocks }
    };

    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    logger.info('Message updated successfully');
    return result;
  } catch (error) {
    logger.error('Failed to update message:', error);
    return null;
  }
}

/**
 * Send a message using the Web API (requires bot token)
 */
async function sendMessage(channel, text, options = {}) {
  try {
    const payload = {
      channel: channel,
      text: text,
      thread_ts: options.threadTs,
      ...options.blocks && { blocks: options.blocks }
    };

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }

    logger.info('Message sent successfully');
    return result;
  } catch (error) {
    logger.error('Failed to send message:', error);
    return null;
  }
}

/**
 * Handle streaming responses by updating a message periodically
 * This replaces the real-time streaming we had in Socket Mode
 */
async function handleStreamingResponse(question, channel, threadTs, userId, prefix = "") {
  const aiService = require('../services/aiService');
  
  try {
    // Send initial message
    const initialText = `${prefix}*tail twitching with anticipation* 🐿️`;
    const initialMessage = await sendMessage(channel, initialText, { threadTs });
    
    if (!initialMessage) {
      throw new Error('Failed to send initial message');
    }

    // Start streaming in background (don't await - Lambda will timeout)
    processStreamInBackground(question, channel, initialMessage.ts, userId, prefix);
    
    return { success: true, messageTs: initialMessage.ts };
  } catch (error) {
    logger.error('Error starting streaming response:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process AI stream in background and update message
 * This runs async without blocking the Lambda response
 */
async function processStreamInBackground(question, channel, messageTs, userId, prefix = "") {
  const aiService = require('../services/aiService');
  
  try {
    const result = await aiService.stream(question, userId, channel);
    
    if (!result.success) {
      await updateMessage(channel, messageTs, `❌ <@${userId}> ${result.response}`);
      return;
    }

    let fullResponse = "";
    let citations = [];
    let lastUpdate = Date.now();
    const updateInterval = 3000; // Update every 3 seconds (less frequent for HTTP)

    for await (const chunk of result.stream.textStream) {
      if (typeof chunk === "string") {
        fullResponse += chunk;
      } else if (typeof chunk === "object") {
        if (chunk.type === "text") {
          fullResponse += chunk.content;
        } else if (chunk.type === "citations") {
          citations = chunk.content;
          logger.info(`Stream received ${citations.length} citations`);
        } else if (chunk.type === "complete") {
          break;
        }
      }

      // Update message periodically
      if (Date.now() - lastUpdate > updateInterval && fullResponse.length > 50) {
        await updateMessage(channel, messageTs, `${prefix}${fullResponse}...`);
        lastUpdate = Date.now();
      }
    }

    // Format final response with citations
    let finalResponse = fullResponse;
    if (citations.length > 0) {
      finalResponse += "\n\n📚 *Sources:*\n";
      citations.forEach((citation, index) => {
        const typeEmoji = getCitationEmoji(citation.type);
        finalResponse += `${index + 1}. ${typeEmoji} ${citation.title}\n   ${citation.uri}\n`;
      });
      logger.info(`Added ${citations.length} citations to streaming response`);
    }

    // Final update
    await updateMessage(channel, messageTs, `${prefix}${finalResponse}`);

    const sourceInfo = result.stream.source === "agent" ? " (with knowledge base)" : " (direct model)";
    logger.info(`Completed stream for ${userId}: ${fullResponse.length} chars${sourceInfo}, ${citations.length} citations`);

  } catch (error) {
    logger.error('Error in background stream processing:', error);
    await updateMessage(channel, messageTs, `❌ Error during streaming: ${error.message}`);
  }
}

// Helper function to get emoji for citation type (copied from handlers)
function getCitationEmoji(citationType) {
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
}

module.exports = {
  sendAsyncResponse,
  updateMessage,
  sendMessage,
  handleStreamingResponse,
  processStreamInBackground
};