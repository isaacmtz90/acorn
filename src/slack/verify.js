const crypto = require("crypto");
const { logger } = require("../utils/logger");

/**
 * Verify Slack request signature for security
 * @param {string} body - Raw request body
 * @param {string} signature - X-Slack-Signature header
 * @param {string} timestamp - X-Slack-Request-Timestamp header
 * @returns {boolean} - Whether signature is valid
 */
function verifySlackSignature(body, signature, timestamp) {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      logger.error("SLACK_SIGNING_SECRET not configured");
      return false;
    }

    if (!signature || !timestamp) {
      logger.error("Missing signature or timestamp in headers");
      return false;
    }

    // Check if timestamp is recent (within 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);

    if (Math.abs(currentTime - requestTime) > 300) {
      logger.error("Request timestamp too old", {
        currentTime,
        requestTime,
        difference: Math.abs(currentTime - requestTime),
      });
      return false;
    }

    // Create signature
    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature = `v0=${crypto
      .createHmac("sha256", signingSecret)
      .update(sigBasestring, "utf8")
      .digest("hex")}`;

    // Use timing-safe comparison to prevent timing attacks
    const result = crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(mySignature, "utf8")
    );

    if (!result) {
      logger.error("Signature verification failed", {
        received: signature,
        expected: mySignature,
        timestamp: timestamp,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error verifying Slack signature:", error);
    return false;
  }
}

module.exports = {
  verifySlackSignature,
};
