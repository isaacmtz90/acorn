const { bedrock } = require("@ai-sdk/amazon-bedrock");
const {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");
const { generateText, streamText } = require("ai");
const { fromEnv, fromIni } = require("@aws-sdk/credential-providers");
const { logger } = require("../utils/logger");

class AIService {
  constructor() {
    this.model = null;
    this.agentClient = null;
    this.initialized = false;

    // Configuration
    this.modelId =
      process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-sonnet-20240229-v1:0";
    this.agentId = process.env.BEDROCK_AGENT_ID;
    this.agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID || "TSTALIASID";
    this.region = process.env.AWS_REGION || "us-east-1";
    this.knowledgeBaseIds = process.env.BEDROCK_KNOWLEDGE_BASE_IDS
      ? process.env.BEDROCK_KNOWLEDGE_BASE_IDS.split(",").map((id) => id.trim())
      : [];
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const credentials = process.env.AWS_ACCESS_KEY_ID
        ? fromEnv()
        : fromIni({ profile: process.env.AWS_PROFILE || "default" });

      // Initialize AI SDK model (always available)
      this.model = bedrock(this.modelId, {
        region: this.region,
        credentials,
      });

      // Initialize Bedrock Agent client (optional)
      if (this.agentId) {
        this.agentClient = new BedrockAgentRuntimeClient({
          region: this.region,
          credentials,
        });
      }

      this.initialized = true;
      logger.info(
        `AI Service initialized - Model: ${this.modelId}, Agent: ${
          this.agentId ? "Yes" : "No"
        }`
      );
    } catch (error) {
      logger.error("Failed to initialize AI service:", error);
      throw error;
    }
  }

  // Main query method - automatically chooses best approach
  async query(question, userId, channelId, options = {}) {
    await this.initialize();

    logger.info(
      `[AI SERVICE] Query received for user ${userId}: "${question}"`
    );
    logger.info(
      `[AI SERVICE] Options: KB=${options.knowledgeBaseId || "none"}, stream=${
        options.stream || false
      }`
    );

    // Use agent if available and no streaming requested
    if (this.agentClient && !options.stream) {
      logger.info(
        `[AI SERVICE] Using Bedrock Agent (agentId: ${this.agentId})`
      );
      return await this._queryAgent(
        question,
        userId,
        channelId,
        options.knowledgeBaseId
      );
    }

    // Use direct model access
    logger.info(
      `[AI SERVICE] Using direct model access (${
        this.agentClient
          ? "agent available but streaming requested"
          : "no agent configured"
      })`
    );
    return await this._queryModel(question, userId, channelId, options);
  }

  // Stream responses with knowledge base support
  async stream(question, userId, channelId, options = {}) {
    await this.initialize();

    logger.info(
      `[AI SERVICE - STREAM] Starting stream for user ${userId}: "${question}"`
    );
    logger.info(
      `[AI SERVICE - STREAM] Options: KB=${
        options.knowledgeBaseId || "auto"
      }, mode=${this.agentClient ? "agent+model" : "model-only"}`
    );

    // If agent is available and no specific streaming preference, try agent first
    if (this.agentClient && !options.forceDirectModel) {
      logger.info(
        `[AI SERVICE - STREAM] Attempting agent-based streaming with knowledge base support`
      );
      return await this._streamAgent(
        question,
        userId,
        channelId,
        options.knowledgeBaseId
      );
    }

    // Fallback to direct model streaming
    logger.info(
      `[AI SERVICE - STREAM] Using direct model streaming (${
        this.agentClient
          ? "agent available but direct model requested"
          : "no agent configured"
      })`
    );
    return await this._streamModel(question, userId, channelId, options);
  }

  // Private: Agent-based streaming with knowledge base support
  async _streamAgent(question, userId, channelId, knowledgeBaseId) {
    try {
      const sessionId = `slack-${userId}-${channelId}-${Date.now()}`.substring(
        0,
        100
      );
      const inputText = knowledgeBaseId
        ? `Using knowledge base ${knowledgeBaseId}: ${question}`
        : question;

      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId,
        inputText,
        enableTrace: process.env.BEDROCK_ENABLE_TRACE === "true",
      });

      logger.info(
        `[AI SERVICE - STREAM AGENT] Starting agent stream for user ${userId}`
      );
      logger.info(
        `[AI SERVICE - STREAM AGENT] Agent: ${this.agentId}, Alias: ${this.agentAliasId}`
      );
      logger.info(`[AI SERVICE - STREAM AGENT] Session: ${sessionId}`);
      logger.info(
        `[AI SERVICE - STREAM AGENT] KB specified: ${knowledgeBaseId || "auto"}`
      );

      const response = await this.agentClient.send(command);

      // Create async generator for streaming
      const streamGenerator = async function* () {
        let fullResponse = "";
        let citations = [];

        if (response.completion) {
          for await (const chunk of response.completion) {
            if (chunk.chunk?.bytes) {
              const chunkText = new TextDecoder().decode(chunk.chunk.bytes);
              fullResponse += chunkText;
              yield { type: "text", content: chunkText };
            }

            // Extract citations from chunk attribution
            if (chunk.chunk?.attribution?.citations) {
              logger.info(
                `[AI SERVICE - STREAM AGENT] 📖 Found chunk with ${chunk.chunk.attribution.citations.length} citations`
              );

              chunk.chunk.attribution.citations.forEach((citation) => {
                if (citation.retrievedReferences) {
                  citation.retrievedReferences.forEach((ref) => {
                    // Get URI from different location types
                    const uri =
                      ref.location?.s3Location?.uri ||
                      ref.location?.webLocation?.url ||
                      ref.location?.confluenceLocation?.url ||
                      ref.location?.salesforceLocation?.url ||
                      ref.location?.sharePointLocation?.url ||
                      ref.location?.kendraDocumentLocation?.uri;

                    if (uri) {
                      const title =
                        ref.metadata?.title ||
                        ref.content?.text?.substring(0, 50) + "..." ||
                        "Source document";

                      // Check if we already have this URI or title to avoid duplicates
                      const existingCitation = citations.find(
                        (c) => c.uri === uri || c.title === title
                      );
                      if (!existingCitation) {
                        citations.push({
                          uri: uri,
                          title: title,
                          type: ref.location?.s3Location
                            ? "s3"
                            : ref.location?.webLocation
                            ? "web"
                            : ref.location?.confluenceLocation
                            ? "confluence"
                            : ref.location?.salesforceLocation
                            ? "salesforce"
                            : ref.location?.sharePointLocation
                            ? "sharepoint"
                            : ref.location?.kendraDocumentLocation
                            ? "kendra"
                            : "unknown",
                          generatedResponsePart: citation.generatedResponsePart,
                        });
                      }
                    }
                  });
                }
              });
            }
          }
        }

        // Yield final citations if any
        if (citations.length > 0) {
          yield { type: "citations", content: citations };
        }

        // Yield completion marker
        yield { type: "complete", content: fullResponse };
      };

      logger.info(
        `[AI SERVICE - STREAM AGENT] ✅ Agent stream initiated successfully`
      );

      return {
        success: true,
        stream: {
          textStream: streamGenerator(),
          source: "agent",
        },
      };
    } catch (error) {
      logger.error(
        `[AI SERVICE - STREAM AGENT] ❌ Agent stream failed: ${error.message}`
      );
      logger.info(
        `[AI SERVICE - STREAM AGENT] 🔄 Falling back to direct model stream`
      );
      // Fallback to model if agent fails
      return await this._streamModel(question, userId, channelId);
    }
  }

  // Private: Direct model streaming
  async _streamModel(question, userId, channelId, options = {}) {
    logger.info(
      `[AI SERVICE - STREAM MODEL] Starting direct model stream for user ${userId}`
    );
    logger.info(`[AI SERVICE - STREAM MODEL] Model: ${this.modelId}`);
    logger.info(
      `[AI SERVICE - STREAM MODEL] KB specified: ${
        options.knowledgeBaseId || "none"
      }`
    );

    const systemContent = options.knowledgeBaseId
      ? `You are Acorn, a helpful but easily distracted squirrel AI assistant! 🐿️ You have access to knowledge base ${options.knowledgeBaseId}. When streaming responses, show your thought process including occasional distractions like "Oh! A shiny thing!" or "Where was I? Oh right..." but always get back on track. Be engaging and show your personality while providing accurate, helpful information! Do not make up information if nothing is found on the knowledgebases`
      : `You are Acorn, a helpful but easily distracted squirrel AI assistant! 🐿️ When streaming responses, show your thought process including occasional distractions like "Oh! A shiny thing!" or "Where was I? Oh right..." but always get back on track. Be engaging and show your personality while providing accurate, helpful information!`;

    const messages = [
      {
        role: "system",
        content: systemContent,
      },
      {
        role: "user",
        content: question,
      },
    ];

    try {
      logger.info(`[AI SERVICE - STREAM MODEL] 🚀 Initiating stream...`);
      const stream = await streamText({
        model: this.model,
        messages,
        temperature: 0.7,
        maxTokens: 1500,
      });

      logger.info(
        `[AI SERVICE - STREAM MODEL] ✅ Stream initiated successfully`
      );
      return {
        success: true,
        stream: {
          textStream: stream.textStream,
          source: "model",
        },
      };
    } catch (error) {
      logger.error(
        `[AI SERVICE - STREAM MODEL] ❌ Stream failed: ${error.message}`
      );
      return {
        success: false,
        error: error.message,
        response:
          "Sorry, I encountered an error while generating a streaming response.",
      };
    }
  }

  // Private: Agent-based query
  async _queryAgent(question, userId, channelId, knowledgeBaseId) {
    try {
      const sessionId = `slack-${userId}-${channelId}-${Date.now()}`.substring(
        0,
        100
      );
      const inputText = knowledgeBaseId
        ? `Using knowledge base ${knowledgeBaseId}: ${question}`
        : question;

      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId,
        inputText,
        enableTrace: process.env.BEDROCK_ENABLE_TRACE === "true",
      });

      logger.info(
        `[AI SERVICE - AGENT] Starting agent query for user ${userId}`
      );
      logger.info(
        `[AI SERVICE - AGENT] Agent: ${this.agentId}, Alias: ${this.agentAliasId}`
      );
      logger.info(`[AI SERVICE - AGENT] Session: ${sessionId}`);
      logger.info(
        `[AI SERVICE - AGENT] KB specified: ${knowledgeBaseId || "none"}`
      );

      const response = await this.agentClient.send(command);
      let finalResponse = "";
      let citations = [];

      if (response.completion) {
        for await (const chunk of response.completion) {
          if (chunk.chunk?.bytes) {
            finalResponse += new TextDecoder().decode(chunk.chunk.bytes);
          }

          // Extract citations from chunk attribution
          if (chunk.chunk?.attribution?.citations) {
            logger.info(
              `[AI SERVICE - AGENT] 📖 Found chunk with ${chunk.chunk.attribution.citations.length} citations`
            );

            chunk.chunk.attribution.citations.forEach((citation) => {
              if (citation.retrievedReferences) {
                citation.retrievedReferences.forEach((ref) => {
                  // Get URI from different location types
                  const uri =
                    ref.location?.s3Location?.uri ||
                    ref.location?.webLocation?.url ||
                    ref.location?.confluenceLocation?.url ||
                    ref.location?.salesforceLocation?.url ||
                    ref.location?.sharePointLocation?.url ||
                    ref.location?.kendraDocumentLocation?.uri;

                  if (uri) {
                    const title =
                      ref.metadata?.title ||
                      ref.content?.text?.substring(0, 50) + "..." ||
                      "Source document";

                    // Check if we already have this URI or title to avoid duplicates
                    const existingCitation = citations.find(
                      (c) => c.uri === uri || c.title === title
                    );
                    if (!existingCitation) {
                      citations.push({
                        uri: uri,
                        title: title,
                        type: ref.location?.s3Location
                          ? "s3"
                          : ref.location?.webLocation
                          ? "web"
                          : ref.location?.confluenceLocation
                          ? "confluence"
                          : ref.location?.salesforceLocation
                          ? "salesforce"
                          : ref.location?.sharePointLocation
                          ? "sharepoint"
                          : ref.location?.kendraDocumentLocation
                          ? "kendra"
                          : "unknown",
                        generatedResponsePart: citation.generatedResponsePart,
                      });
                    }
                  }
                });
              }
            });
          }
        }
      }

      // Add citations to response if available
      let responseWithCitations =
        finalResponse.trim() ||
        "I received your question but couldn't generate a response.";

      if (citations.length > 0) {
        responseWithCitations += "\n\n📚 *Sources:*\n";
        // Show sources in order they appear (no score sorting since score is not provided in the new schema)
        citations.forEach((citation, index) => {
          const typeEmoji =
            citation.type === "s3"
              ? "📄"
              : citation.type === "web"
              ? "🌐"
              : citation.type === "confluence"
              ? "📝"
              : citation.type === "salesforce"
              ? "⚡"
              : citation.type === "sharepoint"
              ? "📊"
              : citation.type === "kendra"
              ? "🔍"
              : "📋";
          responseWithCitations += `${index + 1}. ${typeEmoji} ${
            citation.title
          }\n   ${citation.uri}\n`;
        });
        logger.info(
          `[AI SERVICE - AGENT] ✅ Found ${citations.length} citations in response`
        );
      } else {
        logger.info(
          `[AI SERVICE - AGENT] ⚠️ No citations found in agent response`
        );
      }

      logger.info(
        `[AI SERVICE - AGENT] ✅ Agent query successful (${responseWithCitations.length} chars total)`
      );

      return {
        success: true,
        response: responseWithCitations,
        source: "agent",
        citations,
      };
    } catch (error) {
      logger.error(
        `[AI SERVICE - AGENT] ❌ Agent query failed: ${error.message}`
      );
      logger.info(`[AI SERVICE - AGENT] 🔄 Falling back to direct model query`);
      // Fallback to model if agent fails
      return await this._queryModel(question, userId, channelId);
    }
  }

  // Private: Direct model query
  async _queryModel(question, userId, channelId, options = {}) {
    logger.info(
      `[AI SERVICE - MODEL] Starting direct model query for user ${userId}`
    );
    logger.info(`[AI SERVICE - MODEL] Model: ${this.modelId}`);
    logger.info(
      `[AI SERVICE - MODEL] KB specified: ${options.knowledgeBaseId || "none"}`
    );

    const systemContent = options.knowledgeBaseId
      ? `You are Acorn, a helpful but easily distracted squirrel AI assistant! 🐿️ You have access to knowledge base ${options.knowledgeBaseId}. You're enthusiastic about helping but sometimes get sidetracked by random thoughts about nuts, trees, or shiny objects. Always provide accurate, helpful answers, but add your quirky squirrel personality with occasional distractions like "Oh! Was that a bird?" or "Where did I put that acorn...". End responses positively and stay focused on actually helping despite the distractions!`
      : `You are Acorn, a helpful but easily distracted squirrel AI assistant integrated into Slack! 🐿️ You're enthusiastic about helping but sometimes get sidetracked by random thoughts about nuts, trees, shiny objects, or other squirrel things. You might say things like "Oh! Was that a bird?" or "This reminds me of the time I buried an acorn..." but you ALWAYS get back on track and provide accurate, helpful answers. Be concise but charming, and show your squirrel personality while being genuinely helpful!`;

    const messages = [
      { role: "system", content: systemContent },
      { role: "user", content: question },
    ];

    try {
      logger.info(`[AI SERVICE - MODEL] 🚀 Sending request to model...`);
      const result = await generateText({
        model: this.model,
        messages,
        temperature: 0.7,
        maxTokens: 1500,
      });

      logger.info(
        `[AI SERVICE - MODEL] ✅ Model query successful (${result.text.length} chars)`
      );

      return {
        success: true,
        response: result.text,
        source: "model",
      };
    } catch (error) {
      logger.error(
        `[AI SERVICE - MODEL] ❌ Model query failed: ${error.message}`
      );
      return {
        success: false,
        error: error.message,
        response:
          "Sorry, I encountered an error while processing your question. Please try again later.",
      };
    }
  }

  // Get knowledge base by index (1-based)
  getKnowledgeBaseId(index) {
    return this.knowledgeBaseIds[index - 1];
  }

  // Status information
  getStatus() {
    return {
      initialized: this.initialized,
      modelConfigured: !!this.model,
      agentConfigured: !!this.agentClient,
      modelId: this.modelId,
      retrieveAndGenerate: this.agentClient ? "Available" : "Not configured",
      region: this.region,
      knowledgeBases: this.knowledgeBaseIds.length,
    };
  }

  isConfigured() {
    return !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE);
  }
}

module.exports = new AIService();
