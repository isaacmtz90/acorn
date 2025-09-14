import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import crypto from "crypto";

/**
 * Create a standardized HTTP response with enhanced Lambda context
 */
export function createResponse(
  statusCode: number,
  body: any,
  additionalHeaders: Record<string, string> = {},
  context?: Context
): APIGatewayProxyResult {
  const responseBody = typeof body === "string" ? body : JSON.stringify(body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...additionalHeaders,
  };

  // Add Lambda context headers for debugging
  if (context) {
    headers["X-Request-ID"] = context.awsRequestId;
    headers["X-Function-Name"] = context.functionName;
    headers["X-Function-Version"] = context.functionVersion;

    const remainingTime = context.getRemainingTimeInMillis?.();
    if (remainingTime !== undefined) {
      headers["X-Remaining-Time"] = remainingTime.toString();
    }
  }

  return {
    statusCode,
    headers,
    body: responseBody,
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPrelight(
  event: APIGatewayProxyEvent
): APIGatewayProxyResult | null {
  const method =
    event.httpMethod || (event.requestContext as any)?.http?.method;
  if (method === "OPTIONS") {
    return createResponse(200, "OK");
  }
  return null;
}

/**
 * Parse request body based on content type
 */
export function parseRequestBody(body: string, contentType?: string): any {
  if (!body) {
    return {};
  }

  try {
    if (contentType?.includes("application/json")) {
      return JSON.parse(body);
    }

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(body);
      const result: Record<string, any> = {};
      for (const [key, value] of params) {
        // Handle JSON payload in Slack's payload parameter
        if (key === "payload") {
          result[key] = JSON.parse(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    // Default to JSON parsing
    return JSON.parse(body);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`Failed to parse request body: ${errorMessage}`);
  }
}

/**
 * Verify Slack request signature
 */
export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    throw new Error("SLACK_SIGNING_SECRET environment variable is not set");
  }

  // Check timestamp is within 5 minutes
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const requestTimestamp = parseInt(timestamp);

  if (Math.abs(currentTimestamp - requestTimestamp) > 300) {
    return false;
  }

  // Create expected signature
  const baseString = `v0:${timestamp}:${body}`;
  const expectedSignature = `v0=${crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex")}`;

  // Compare signatures
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle Slack URL verification challenge
 */
export function handleUrlVerification(body: any): APIGatewayProxyResult | null {
  if (body?.type === "url_verification" && body?.challenge) {
    return createResponse(200, { challenge: body.challenge });
  }
  return null;
}

/**
 * Check if this is a Slack retry event and handle accordingly
 * Slack retries events if not acknowledged within 3 seconds
 */
export function handleSlackRetry(event: APIGatewayProxyEvent): APIGatewayProxyResult | null {
  // Check for Slack retry headers (case-insensitive)
  const retryNum = event.headers?.["X-Slack-Retry-Num"] ||
                   event.headers?.["x-slack-retry-num"];

  const retryReason = event.headers?.["X-Slack-Retry-Reason"] ||
                      event.headers?.["x-slack-retry-reason"];

  if (retryNum) {
    // This is a retry event - return 200 immediately to stop retries
    return createResponse(200, {
      ok: true,
      message: `Retry event #${retryNum} acknowledged${retryReason ? ` (reason: ${retryReason})` : ''}`
    });
  }

  return null;
}

/**
 * Extract request information for logging
 */
export function getRequestInfo(event: APIGatewayProxyEvent) {
  return {
    method:
      event.httpMethod || (event.requestContext as any)?.http?.method || "POST",
    path: event.path || event.requestContext?.resourcePath,
    userAgent: event.headers?.["User-Agent"] || event.headers?.["user-agent"],
    sourceIp: event.requestContext?.identity?.sourceIp,
    requestId: event.requestContext?.requestId,
    // Include Slack-specific headers for debugging
    slackRetryNum: event.headers?.["X-Slack-Retry-Num"] || event.headers?.["x-slack-retry-num"],
    slackRetryReason: event.headers?.["X-Slack-Retry-Reason"] || event.headers?.["x-slack-retry-reason"],
    slackSignature: event.headers?.["X-Slack-Signature"] || event.headers?.["x-slack-signature"] ? "present" : "missing",
    slackTimestamp: event.headers?.["X-Slack-Request-Timestamp"] || event.headers?.["x-slack-request-timestamp"],
  };
}

/**
 * Check if Lambda is approaching timeout
 */
export function isApproachingTimeout(context: Context, bufferMs: number = 5000): boolean {
  const remainingTime = context.getRemainingTimeInMillis?.() ?? 30000;
  return remainingTime <= bufferMs;
}

/**
 * Create error response with Lambda context
 */
export function createErrorResponse(
  error: Error,
  context: Context,
  statusCode: number = 500
): APIGatewayProxyResult {
  return createResponse(
    statusCode,
    {
      error: error.message,
      type: error.constructor.name,
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
    },
    {},
    context
  );
}

/**
 * Validate Lambda environment variables
 */
export function validateEnvironment(requiredVars: string[]): { valid: boolean; missing: string[] } {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Create timeout-aware fetch with Lambda context
 */
export function createTimeoutAwareFetch(context: Context, bufferMs: number = 5000) {
  return (url: string, options: RequestInit = {}) => {
    const remainingTime = context.getRemainingTimeInMillis?.() ?? 30000;
    const timeoutMs = Math.min(remainingTime - bufferMs, 15000);

    return fetch(url, {
      ...options,
      signal: AbortSignal.timeout(Math.max(timeoutMs, 1000))
    });
  };
}
