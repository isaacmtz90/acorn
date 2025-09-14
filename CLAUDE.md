# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Acorn is a streamlined Slack chatbot application built with Node.js for AWS Lambda deployment. The bot provides intelligent AI capabilities through AWS Bedrock services with automatic agent/model selection and streaming responses through knowledge base integration.

## Development Commands

- `npm install` - Install dependencies
- `npm run dev` - Start the bot in local development mode
- `npm start` - Start the bot for local testing
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run build` - Build for Lambda deployment
- `npm run deploy` - Deploy to AWS Lambda (dev environment)
- `npm run deploy:prod` - Deploy to production

## Architecture

The application uses HTTP Mode with Express for local development and AWS Lambda for production deployment:

### Core Structure
- `src/app.js` - HTTP Mode entry point with Express server for local development
- `src/lambda.js` - AWS Lambda handler for production deployment
- `src/slack/` - HTTP Mode event handlers
  - `eventHandler.js` - Processes all Slack events (mentions, messages, reactions)
  - `responses.js` - Async response utilities using Slack Web API
  - `verify.js` - Slack signature verification for security
- `src/services/` - External service integration
  - `aiService.js` - Unified AI service with automatic agent/model selection
- `src/utils/` - Utility modules
  - `logger.js` - Simple logging utility with timestamps
  - `responses.js` - Personality text and response templates

### Configuration
- Uses HTTP Events Mode for serverless deployment
- Environment variables configured in `.env` (see `.env.example`)
- Required Slack tokens: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- Required AWS credentials: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or `AWS_PROFILE`
- AI configuration: `BEDROCK_MODEL_ID` (defaults to Claude 3 Sonnet)
- Optional Bedrock Agent: `BEDROCK_AGENT_ID`, `BEDROCK_KNOWLEDGE_BASE_IDS`

### Event Processing Architecture
The bot processes Slack events through HTTP requests with signature verification:

**HTTP Event Flow:**
1. Slack sends HTTP POST to `/slack/events`
2. Request signature verification for security
3. Event routing to appropriate handlers
4. AI processing with streaming responses
5. Async message updates via Slack Web API

**Unified AI Service (`aiService.js`):**
- Single service handles both agent and direct model access
- Automatically uses Bedrock Agent when configured, falls back to direct model
- Built-in error handling and graceful fallbacks
- Supports streaming responses with async message updates
- Manages AWS credentials and configuration centrally
- Session generation for agent-based interactions

## Usage Patterns

Users interact with the AI through:

**Direct Mentions:**
- `@bot How do I submit expenses?` - AI queries with streaming responses
- `@bot hello` - Smart greetings with variety
- `@bot help` - Display usage help and commands
- `@bot status` - Check bot health and configuration
- `@bot thanks` - Friendly acknowledgment responses

**Text Patterns (deprecated - all go through mentions now):**
- `ask: question` - General questions (still supported)
- `ask kb1: question` - Specific knowledge base queries

**Information Commands:**
- `@bot info` - Display AI configuration and usage help
- `@bot status` - Show bot and AI service status

## Adding New Features

When adding new bot functionality:
1. Modify `src/slack/eventHandler.js` for event processing
2. Add response utilities to `src/slack/responses.js` 
3. Use the logger utility for consistent logging
4. Handle errors gracefully with try/catch blocks
5. For AI features:
   - Use the unified `aiService.stream()` method for all AI interactions
   - All responses are streamed by default through knowledge base
   - Built-in error handling and fallbacks
6. Test locally with `npm run dev`
7. Deploy with `npm run deploy`

## Deployment

The bot deploys to AWS Lambda using SAM (Serverless Application Model):
- **Local testing**: `npm run dev` (Express server)
- **Lambda deployment**: `npm run deploy` (SAM deploy)
- **Production**: `npm run deploy:prod`

See `LAMBDA_DEPLOYMENT.md` for detailed deployment instructions.