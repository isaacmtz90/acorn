# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Acorn is a streamlined Slack chatbot application built with Node.js using the Slack Bolt framework. The bot provides intelligent AI capabilities through a unified service that automatically chooses between Bedrock Agents (when configured) and direct model access via Vercel's AI SDK.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start the bot in development mode with auto-reload
- `npm start` - Start the bot in production mode
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## Architecture

The application follows a modular handler-based architecture:

### Core Structure

- `src/app.js` - Main application entry point, initializes Slack App and registers handlers
- `src/handlers/` - Event, message, and AI interaction handlers
  - `messageHandler.js` - Handles basic direct messages, greetings, and help
  - `eventHandler.js` - Handles Slack events like member joins and reactions
  - `aiHandler.js` - Text pattern handlers for AI interactions (ask:, stream:, kb queries)
  - `mentionHandler.js` - Enhanced mention handler with comprehensive pattern matching, status/info commands, and smart responses
- `src/services/` - External service integration
  - `aiService.js` - Unified AI service with automatic agent/model selection and comprehensive logging
- `src/utils/` - Utility modules
  - `logger.js` - Simple logging utility with timestamps

### Configuration

- Uses Socket Mode for real-time communication with Slack
- Environment variables configured in `.env` (see `.env.example`)
- Required Slack tokens: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`
- Required AWS credentials: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or `AWS_PROFILE`
- AI configuration: `BEDROCK_MODEL_ID` (defaults to Claude 3 Sonnet)
- Optional Bedrock Agent: `BEDROCK_AGENT_ID`, `BEDROCK_KNOWLEDGE_BASE_IDS`

### Handler Pattern

Each handler module exports a function that takes the Slack App instance and registers event listeners. This modular approach makes it easy to add new functionality by creating new handlers or extending existing ones.

### AI Integration Architecture

The bot uses a unified AI service with automatic selection:

**Unified AI Service (`aiService.js`):**

- Single service handles both agent and direct model access
- Automatically uses Bedrock Agent when configured, falls back to direct model
- Built-in error handling and graceful fallbacks
- Supports both standard and streaming responses
- Manages AWS credentials and configuration centrally
- Session generation for agent-based interactions

## Q&A Usage Patterns

Users can interact with the AI using several methods:

**Standard Queries:**

- `ask: What is the company policy?` - General questions
- `ask kb1: Security guidelines?` - Query specific knowledge base by number
- `@bot How do I submit expenses?` - Direct mention with question

**Enhanced Mentions:**

- `@bot hello` - Smart greetings with variety
- `@bot help` - Display usage help and commands
- `@bot status` - Check bot health and configuration
- `@bot stream explain quantum physics` - Direct streaming via mention
- `@bot thanks` - Friendly acknowledgment responses

**Streaming Responses:**

- `stream: Explain machine learning` - Streaming text responses
- `@acorn stream: Tell me about quantum computing` - Streaming via mention

**Information Commands:**

- `@acorn info` or `info` - Display AI configuration and usage help
- `@acorn status` or `status` - Show bot and AI service status

## Adding New Features

When adding new bot functionality:

1. Create handlers in the appropriate handler file or create a new one
2. Register the handler in `src/app.js`
3. Use the logger utility for consistent logging
4. Handle errors gracefully with try/catch blocks
5. For AI features:
   - Use the unified `aiService.query()` method for all AI interactions
   - Use `aiService.stream()` for streaming responses
   - The service automatically chooses the best approach (agent vs direct model)
   - Built-in error handling and fallbacks
