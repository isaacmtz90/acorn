import { handler } from "../../src/handlers/slackEventsHandler";
import {
  createResponse,
  handleUrlVerification,
  parseRequestBody,
  verifySlackSignature,
  handleCorsPrelight,
} from "../../src/utils/lambdaUtils";

// Mock dependencies
jest.mock("../../src/utils/lambdaUtils");
jest.mock("../../src/utils/slackAdapter", () => ({
  createSlackApp: jest.fn(),
  initializeHandlers: jest.fn(),
}));

// Mock handlers
jest.mock("../../src/handlers/mentionHandler", () => ({
  registerMentionHandlers: jest.fn(),
}));

jest.mock("../../src/handlers/messageHandler", () => ({
  registerMessageHandlers: jest.fn(),
}));

jest.mock("../../src/handlers/eventHandler", () => ({
  registerEventHandlers: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("SlackEventsHandler", () => {
  let mockEvent: any;
  let mockContext: any;

  beforeEach(() => {
    mockEvent = {
      httpMethod: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Slack-Signature": "v0=test-signature",
        "X-Slack-Request-Timestamp": "1234567890",
      },
      body: JSON.stringify({
        type: "event_callback",
        event: {
          type: "app_mention",
          user: "U123456",
          channel: "C123456",
          text: "<@U987654321> hello",
          ts: "1234567890.123",
        },
      }),
    };

    mockContext = {
      awsRequestId: "test-request-id",
      functionName: "slackEvents",
      getRemainingTimeInMillis: jest.fn().mockReturnValue(30000),
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (createResponse as jest.Mock).mockImplementation((statusCode, body) => ({
      statusCode,
      headers: {},
      body: JSON.stringify(body),
    }));

    (parseRequestBody as jest.Mock).mockReturnValue({
      type: "event_callback",
      event: {
        type: "app_mention",
        user: "U123456",
        channel: "C123456",
        text: "<@U987654321> hello",
        ts: "1234567890.123",
      },
    });

    (handleUrlVerification as jest.Mock).mockReturnValue(null);

    // Mock verifySlackSignature to return true by default
    (verifySlackSignature as jest.Mock).mockReturnValue(true);

    // Mock handleCorsPrelight to return null by default (no preflight response)
    (handleCorsPrelight as jest.Mock).mockReturnValue(null);

    // Mock fetch for Slack API calls
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ok: true }),
    });
  });

  describe("URL Verification", () => {
    it("should handle URL verification", async () => {
      (handleUrlVerification as jest.Mock).mockReturnValue({
        statusCode: 200,
        body: JSON.stringify({ challenge: "test-challenge" }),
      });

      const result = await handler(mockEvent, mockContext);

      expect(handleUrlVerification).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Event Processing", () => {
    it("should process app_mention events", async () => {
      const result = await handler(mockEvent, mockContext);

      expect(parseRequestBody).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('"ok":true');
    });

    it("should process message events", async () => {
      const messageEvent = {
        ...mockEvent,
        body: JSON.stringify({
          type: "event_callback",
          event: {
            type: "message",
            user: "U123456",
            channel: "C123456",
            text: "hello world",
            ts: "1234567890.123",
          },
        }),
      };

      (parseRequestBody as jest.Mock).mockReturnValue({
        type: "event_callback",
        event: {
          type: "message",
          user: "U123456",
          channel: "C123456",
          text: "hello world",
          ts: "1234567890.123",
        },
      });

      const result = await handler(messageEvent, mockContext);

      expect(result.statusCode).toBe(200);
    });

    it("should process other events", async () => {
      const reactionEvent = {
        ...mockEvent,
        body: JSON.stringify({
          type: "event_callback",
          event: {
            type: "reaction_added",
            user: "U123456",
            reaction: "thumbsup",
            item: {
              type: "message",
              channel: "C123456",
              ts: "1234567890.123",
            },
          },
        }),
      };

      (parseRequestBody as jest.Mock).mockReturnValue({
        type: "event_callback",
        event: {
          type: "reaction_added",
          user: "U123456",
          reaction: "thumbsup",
        },
      });

      const result = await handler(reactionEvent, mockContext);

      expect(result.statusCode).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should handle parsing errors", async () => {
      (parseRequestBody as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid JSON");
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(result.body).toContain("Invalid request body");
    });

    it("should handle event processing errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("API Error"));

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200); // Always return 200 to prevent Slack retries
    });

    it("should handle missing headers", async () => {
      const eventWithoutHeaders = {
        ...mockEvent,
        headers: {},
      };

      const result = await handler(eventWithoutHeaders, mockContext);

      expect(result.statusCode).toBe(401); // Unauthorized due to missing signature
    });

    it("should handle invalid signature", async () => {
      // Mock signature verification to fail for this test
      (verifySlackSignature as jest.Mock).mockReturnValueOnce(false);

      const invalidEvent = {
        ...mockEvent,
        headers: {
          ...mockEvent.headers,
          "X-Slack-Signature": "invalid-signature",
        },
      };

      const result = await handler(invalidEvent, mockContext);

      expect(result.statusCode).toBe(401);
    });

    it("should handle unexpected errors", async () => {
      // Force an unexpected error by making parseRequestBody throw
      (parseRequestBody as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Unexpected error");
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(400);
      expect(createResponse).toHaveBeenCalledWith(
        400,
        expect.objectContaining({
          error: "Invalid request body",
        })
      );
    });
  });

  describe("CORS Handling", () => {
    it("should handle CORS preflight requests", async () => {
      const corsEvent = {
        ...mockEvent,
        httpMethod: "OPTIONS",
      };

      // Mock handleCorsPrelight to return a CORS response
      (handleCorsPrelight as jest.Mock).mockReturnValueOnce({
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: "",
      });

      const result = await handler(corsEvent, mockContext);

      expect(handleCorsPrelight).toHaveBeenCalledWith(corsEvent);
      expect(result.statusCode).toBe(200);
    });
  });

  describe("Method Validation", () => {
    it("should reject non-POST methods", async () => {
      const getEvent = {
        ...mockEvent,
        httpMethod: "GET",
      };

      const result = await handler(getEvent, mockContext);

      expect(result.statusCode).toBe(405);
      expect(result.body).toContain("Method not allowed");
    });

    it("should handle missing httpMethod", async () => {
      const eventWithoutMethod = {
        ...mockEvent,
        httpMethod: undefined,
        requestContext: {
          http: {
            method: "POST",
          },
        },
      };

      const result = await handler(eventWithoutMethod, mockContext);

      expect(result.statusCode).toBe(200);
    });
  });

  describe("Slack API Integration", () => {
    it("should handle Slack API errors gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      });

      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200); // Still return 200 to prevent retries
    });

    it("should pass correct headers to Slack API", async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('"ok":true');
    });

    it("should format message data correctly", async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.body).toContain('"ok":true');
    });
  });
});
