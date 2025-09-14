import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import crypto from "crypto";

/**
 * Create a standardized HTTP response
 */
export function createResponse(
  statusCode: number,
  body: any,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      ...additionalHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPrelight(
  event: APIGatewayProxyEvent
): APIGatewayProxyResult | null {
  if (event.httpMethod === "OPTIONS") {
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
    throw new Error(`Failed to parse request body: ${error}`);
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
 * Extract request information for logging
 */
export function getRequestInfo(event: APIGatewayProxyEvent) {
  return {
    method: event.httpMethod,
    path: event.path,
    userAgent: event.headers?.["User-Agent"] || event.headers?.["user-agent"],
    sourceIp: event.requestContext?.identity?.sourceIp,
    requestId: event.requestContext?.requestId,
  };
}
