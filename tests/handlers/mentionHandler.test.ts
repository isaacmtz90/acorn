import { registerMentionHandlers } from "../../src/handlers/mentionHandler";

// Mock the streaming helper
jest.mock("../../src/utils/streamingHelper", () => ({
  handleStreamingResponse: jest.fn(),
}));

// Mock the responses module
jest.mock("../../src/utils/responses", () => ({
  getRandomGreeting: jest.fn(
    (userId) => `*scampers over* Hello <@${userId}>! 🐿️`
  ),
  getRandomThankYou: jest.fn((userId) => `You're welcome <@${userId}>! 🌰`),
  getRandomThinkingPrefix: jest.fn(
    (userId) => `*scratches head* <@${userId}> Let me think...`
  ),
  getEmptyMentionResponse: jest.fn((userId) => `You called me? <@${userId}>`),
  getHelpResponse: jest.fn(
    (userId) =>
      `*stops mid-leap* <@${userId}> wants to know what I can do! 🐿️\n\n🌰 **I can help with questions!**`
  ),
  getStatusResponse: jest.fn(
    (userId, aiStatus, uptime) =>
      `<@${userId}> 🐿️\n\n🌰 *Acorn's Status Report*\n• My brain runs on: ${aiStatus.modelId}\n• Tree Location: ${aiStatus.region}\n• Been running for: ${uptime}`
  ),
  getInfoResponse: jest.fn(
    (userId, aiStatus, kbList) =>
      `<@${userId}> 📚🐿️\n\n🌰 *Acorn's Brain Configuration*\n• My Brain Model: ${aiStatus.modelId}\n• My Tree Location: ${aiStatus.region}\n\n*My Knowledge Nut Collection:*\n${kbList}`
  ),
}));

// Mock the AI service
jest.mock("../../src/services/aiService", () => ({
  __esModule: true,
  default: {
    getStatus: jest.fn().mockReturnValue({
      initialized: true,
      modelConfigured: true,
      agentConfigured: true,
      modelId: "claude-3-sonnet",
      retrieveAndGenerate: "Available",
      region: "us-east-1",
      knowledgeBases: 2,
    }),
    knowledgeBaseIds: ["kb1234567890abcdef", "kb0987654321fedcba"],
  },
}));

import { handleStreamingResponse } from "../../src/utils/streamingHelper";
import aiService from "../../src/services/aiService";

describe("MentionHandler", () => {
  let mockApp: any;
  let mockSay: jest.Mock;
  let mockEvent: any;

  beforeEach(() => {
    mockSay = jest.fn();
    mockEvent = {
      user: "U123456",
      channel: "C123456",
      ts: "1234567890.123",
      text: "<@U987654321> hello there",
    };

    mockApp = {
      event: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("registerMentionHandlers", () => {
    it("should register app_mention handler", () => {
      registerMentionHandlers(mockApp);

      expect(mockApp.event).toHaveBeenCalledWith(
        "app_mention",
        expect.any(Function)
      );
    });
  });

  describe("app_mention handler", () => {
    beforeEach(() => {
      registerMentionHandlers(mockApp);
    });

    const getMentionHandler = () => {
      return mockApp.event.mock.calls.find(
        (call) => call[0] === "app_mention"
      )[1];
    };

    describe("empty mentions", () => {
      it("should handle empty mention text", async () => {
        const handler = getMentionHandler();
        const emptyEvent = { ...mockEvent, text: "<@U987654321>" };

        await handler({ event: emptyEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("You called me?"),
          thread_ts: "1234567890.123",
        });
      });

      it("should handle very short mentions", async () => {
        const handler = getMentionHandler();
        const shortEvent = { ...mockEvent, text: "<@U987654321> a" };

        await handler({ event: shortEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("You called me?"),
          thread_ts: "1234567890.123",
        });
      });
    });

    describe("greeting patterns", () => {
      const greetings = ["hi", "hello", "hey", "howdy", "good morning"];

      greetings.forEach((greeting) => {
        it(`should respond to "${greeting}"`, async () => {
          const handler = getMentionHandler();
          const greetingEvent = {
            ...mockEvent,
            text: `<@U987654321> ${greeting}`,
          };

          await handler({ event: greetingEvent, say: mockSay });

          expect(mockSay).toHaveBeenCalledWith({
            text: expect.stringContaining("<@U123456>"),
            thread_ts: "1234567890.123",
          });
          expect(mockSay.mock.calls[0][0].text).toMatch(
            /pokes head up|scampers over|chittering/
          );
        });
      });
    });

    describe("help requests", () => {
      const helpPhrases = ["help", "what can you do", "commands", "usage"];

      helpPhrases.forEach((phrase) => {
        it(`should respond to "${phrase}"`, async () => {
          const handler = getMentionHandler();
          const helpEvent = { ...mockEvent, text: `<@U987654321> ${phrase}` };

          await handler({ event: helpEvent, say: mockSay });

          expect(mockSay).toHaveBeenCalledWith({
            text: expect.stringContaining("I can help with questions!"),
            thread_ts: "1234567890.123",
          });
        });
      });
    });

    describe("thank you responses", () => {
      const thankYouPhrases = ["thank you", "thanks", "thx", "appreciate"];

      thankYouPhrases.forEach((phrase) => {
        it(`should respond to "${phrase}"`, async () => {
          const handler = getMentionHandler();
          const thanksEvent = { ...mockEvent, text: `<@U987654321> ${phrase}` };

          await handler({ event: thanksEvent, say: mockSay });

          expect(mockSay).toHaveBeenCalledWith({
            text: expect.stringContaining("<@U123456>"),
            thread_ts: "1234567890.123",
          });
          expect(mockSay.mock.calls[0][0].text).toMatch(
            /welcome|anytime|what I'm here for|helping humans/
          );
        });
      });
    });

    describe("status requests", () => {
      it("should respond to status request", async () => {
        const handler = getMentionHandler();
        const statusEvent = { ...mockEvent, text: "<@U987654321> status" };

        await handler({ event: statusEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("Acorn's Status Report"),
          thread_ts: "1234567890.123",
        });

        const statusText = mockSay.mock.calls[0][0].text;
        expect(statusText).toContain("claude-3-sonnet");
        expect(statusText).toContain("us-east-1");
      });

      it("should include uptime in status", async () => {
        const handler = getMentionHandler();
        const statusEvent = {
          ...mockEvent,
          text: "<@U987654321> are you working",
        };

        await handler({ event: statusEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("Been running for:"),
          thread_ts: "1234567890.123",
        });
      });
    });

    describe("info requests", () => {
      it("should respond to info request", async () => {
        const handler = getMentionHandler();
        const infoEvent = { ...mockEvent, text: "<@U987654321> info" };

        await handler({ event: infoEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("Acorn's Brain Configuration"),
          thread_ts: "1234567890.123",
        });

        const infoText = mockSay.mock.calls[0][0].text;
        expect(infoText).toContain("claude-3-sonnet");
        expect(infoText).toContain("Knowledge Nut Collection");
      });

      it("should handle different info patterns", async () => {
        const handler = getMentionHandler();
        const patterns = [
          "config",
          "configuration",
          "ai info",
          "brain",
          "setup",
        ];

        for (const pattern of patterns) {
          mockSay.mockClear();
          const infoEvent = { ...mockEvent, text: `<@U987654321> ${pattern}` };

          await handler({ event: infoEvent, say: mockSay });

          expect(mockSay).toHaveBeenCalledWith({
            text: expect.stringContaining("Acorn's Brain Configuration"),
            thread_ts: "1234567890.123",
          });
        }
      });
    });

    describe("AI streaming queries", () => {
      it("should handle general questions with streaming", async () => {
        const handler = getMentionHandler();
        const questionEvent = {
          ...mockEvent,
          text: "<@U987654321> What is the meaning of life?",
        };

        await handler({ event: questionEvent, say: mockSay });

        expect(handleStreamingResponse).toHaveBeenCalledWith(
          "What is the meaning of life?",
          questionEvent,
          mockApp,
          expect.stringContaining("<@U123456>")
        );
      });

      it("should strip bot mention from question", async () => {
        const handler = getMentionHandler();
        const questionEvent = {
          ...mockEvent,
          text: "<@U987654321> <@U111111111> How does AI work?",
        };

        await handler({ event: questionEvent, say: mockSay });

        expect(handleStreamingResponse).toHaveBeenCalledWith(
          "How does AI work?",
          questionEvent,
          mockApp,
          expect.any(String)
        );
      });

      it("should use random thinking prefix", async () => {
        const handler = getMentionHandler();
        const questionEvent = {
          ...mockEvent,
          text: "<@U987654321> Tell me about quantum physics",
        };

        await handler({ event: questionEvent, say: mockSay });

        expect(handleStreamingResponse).toHaveBeenCalledWith(
          "Tell me about quantum physics",
          questionEvent,
          mockApp,
          expect.stringMatching(
            /(scratches head|drops acorn|chittering thoughtfully).*<@U123456>/
          )
        );
      });
    });

    describe("error handling", () => {
      it("should handle errors gracefully", async () => {
        const handler = getMentionHandler();
        mockSay.mockRejectedValueOnce(new Error("API Error"));

        await handler({ event: mockEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("encountered an error"),
          thread_ts: "1234567890.123",
        });
      });

      it("should handle missing event properties", async () => {
        const handler = getMentionHandler();
        const incompleteEvent = { user: "U123456" };

        await expect(
          handler({ event: incompleteEvent, say: mockSay })
        ).resolves.not.toThrow();
      });

      it("should handle streaming errors", async () => {
        const handler = getMentionHandler();
        (handleStreamingResponse as jest.Mock).mockRejectedValueOnce(
          new Error("Streaming error")
        );

        const questionEvent = {
          ...mockEvent,
          text: "<@U987654321> What is AI?",
        };

        await expect(
          handler({ event: questionEvent, say: mockSay })
        ).resolves.not.toThrow();
      });
    });

    describe("text cleaning", () => {
      it("should remove bot mentions from text", async () => {
        const handler = getMentionHandler();
        const mentionEvent = {
          ...mockEvent,
          text: "<@U987654321> <@U111111111> <@U222222222> clean this text",
        };

        await handler({ event: mentionEvent, say: mockSay });

        expect(handleStreamingResponse).toHaveBeenCalledWith(
          "clean this text",
          mentionEvent,
          mockApp,
          expect.any(String)
        );
      });

      it("should handle text with only mentions", async () => {
        const handler = getMentionHandler();
        const onlyMentionsEvent = {
          ...mockEvent,
          text: "<@U987654321> <@U111111111>",
        };

        await handler({ event: onlyMentionsEvent, say: mockSay });

        expect(mockSay).toHaveBeenCalledWith({
          text: expect.stringContaining("You called me?"),
          thread_ts: "1234567890.123",
        });
      });
    });
  });
});
