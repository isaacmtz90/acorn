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
  processSlackEvent,
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

    // Validate request method
    const method = event.httpMethod;
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

    // Initialize Slack app
    const app = await initializeSlackApp();

    // Process the Slack event
    try {
      await processSlackEvent(app, body, {
        awsRequestId: context.awsRequestId,
        functionName: context.functionName,
        getRemainingTimeInMillis: context.getRemainingTimeInMillis,
      });

      // Slack expects a 200 response for successful event processing
      return createResponse(200, { ok: true });
    } catch (eventError) {
      logger.error("Error processing Slack event:", eventError);

      // Still return 200 to prevent Slack from retrying
      // Log the error for debugging but don't expose internal errors
      return createResponse(200, {
        ok: false,
        error: "Internal processing error",
      });
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
