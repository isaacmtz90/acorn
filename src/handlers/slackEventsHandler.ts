import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { logger } from "../utils/logger";
import {
  verifySlackSignature,
  createResponse,
  handleUrlVerification,
  parseRequestBody,
  getRequestInfo,
  handleCorsPrelight,
} from "../utils/lambdaUtils";
import {
  createSlackApp,
  initializeHandlers,
} from "../utils/slackAdapter";

// Initialize Slack app once (outside handler for reuse across invocations)
let slackApp: any = null;

/**
 * Initialize the Slack app if not already initialized
 */
async function initializeSlackApp() {
  if (!slackApp) {
    logger.info("Initializing Slack app for Events API");
    slackApp = createSlackApp();
    await initializeHandlers(slackApp);
  }
  return slackApp;
}

/**
 * AWS Lambda handler for Slack Events API
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Add request ID to logger context
  const requestInfo = getRequestInfo(event);
  logger.info("Slack Events API request received", requestInfo);

  try {
    // Handle CORS preflight requests
    const corsResponse = handleCorsPrelight(event);
    if (corsResponse) {
      return corsResponse;
    }

    // Validate request method - handle both AWS and serverless-offline formats
    const method =
      event.httpMethod || (event.requestContext as any)?.http?.method || "POST";
    if (method !== "POST") {
      logger.warn(`Invalid method: ${method}`);
      return createResponse(405, { error: "Method not allowed" });
    }

    // Parse request body
    const contentType =
      event.headers?.["Content-Type"] || event.headers?.["content-type"];
    let body;

    try {
      body = parseRequestBody(event.body || "", contentType);
    } catch (error) {
      logger.error("Failed to parse request body:", error);
      return createResponse(400, { error: "Invalid request body" });
    }

    // Verify Slack signature
    const slackSignature =
      event.headers?.["X-Slack-Signature"] ||
      event.headers?.["x-slack-signature"];
    const timestamp =
      event.headers?.["X-Slack-Request-Timestamp"] ||
      event.headers?.["x-slack-request-timestamp"];

    if (
      !slackSignature ||
      !timestamp ||
      !verifySlackSignature(slackSignature, timestamp, event.body || "")
    ) {
      logger.error("Invalid Slack signature");
      return createResponse(401, { error: "Unauthorized" });
    }

    // Handle URL verification challenge
    const challengeResponse = handleUrlVerification(body);
    if (challengeResponse) {
      return challengeResponse;
    }

    // Initialize Slack app (we don't need the app instance for direct API calls)
    await initializeSlackApp();

    // Process Slack events directly without relying on Bolt internals
    try {
      if (body.type === "event_callback" && body.event) {
        const slackEvent = body.event;
        logger.info(`Processing Slack event: ${slackEvent.type}`, {
          user: slackEvent.user,
          channel: slackEvent.channel
        });

        // Create event context for handlers
        const eventContext = {
          event: slackEvent,
          body: body,
          say: async (options: any) => {
            // Use fetch to make direct Slack API calls
            const messageOptions = typeof options === 'string' ? { text: options } : options;

            const response = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                channel: slackEvent.channel,
                ...messageOptions,
                thread_ts: slackEvent.ts
              })
            });

            if (!response.ok) {
              throw new Error(`Slack API error: ${response.status}`);
            }
          },
          client: {
            chat: {
              postMessage: async (options: any) => {
                const response = await fetch('https://slack.com/api/chat.postMessage', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(options)
                });

                if (!response.ok) {
                  throw new Error(`Slack API error: ${response.status}`);
                }
                return await response.json();
              },
              update: async (options: any) => {
                const response = await fetch('https://slack.com/api/chat.update', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(options)
                });

                if (!response.ok) {
                  throw new Error(`Slack API error: ${response.status}`);
                }
                return await response.json();
              }
            }
          },
          ack: async () => {}, // No-op for Events API
        };

        // Process events through our registered handlers
        if (slackEvent.type === "app_mention") {
          // Import and call mention handler directly
          const { registerMentionHandlers } = await import("../handlers/mentionHandler");
          const tempApp = {
            event: (eventType: string, handler: any) => {
              if (eventType === "app_mention") {
                handler(eventContext);
              }
            },
            // Add the client property needed by streamingHelper
            client: eventContext.client
          };
          registerMentionHandlers(tempApp as any);
        } else if (slackEvent.type === "message" && slackEvent.text) {
          // Import and call message handler directly
          const { registerMessageHandlers } = await import("../handlers/messageHandler");

          const tempApp = {
            message: (pattern: any, handler: any) => {
              const messageContext = {
                ...eventContext,
                message: slackEvent
              };

              if (typeof pattern === 'string') {
                if (slackEvent.text?.includes(pattern)) {
                  handler(messageContext);
                }
              } else if (pattern instanceof RegExp) {
                if (pattern.test(slackEvent.text || '')) {
                  handler(messageContext);
                }
              } else if (typeof pattern === 'function') {
                // Generic message handler
                handler(messageContext);
              }
            }
          };
          registerMessageHandlers(tempApp as any);
        } else {
          // Handle other events (member_joined_channel, reaction_added, etc.)
          const { registerEventHandlers } = await import("../handlers/eventHandler");
          const tempApp = {
            event: (eventType: string, handler: any) => {
              if (eventType === slackEvent.type) {
                handler(eventContext);
              }
            }
          };
          registerEventHandlers(tempApp as any);
        }
      }

      return createResponse(200, { ok: true });
    } catch (eventError) {
      logger.error("Error processing Slack event:", eventError);
      return createResponse(200, { ok: true }); // Always return 200 for Slack
    }
  } catch (error) {
    logger.error("Unexpected error in Events API handler:", error);

    // Return 500 for unexpected errors
    return createResponse(500, {
      error: "Internal server error",
      requestId: context.awsRequestId,
    });
  }
};
