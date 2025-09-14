# Acorn Slack Bot

A Slack chatbot application built with Node.js using the Slack Bolt framework, integrated with AWS Bedrock for intelligent Q&A capabilities using Vercel's AI SDK.

## Features

- 🤖 **Slack Integration**: Full Slack Bot API support with Socket Mode & HTTP API modes
- 🧠 **AI-Powered Responses**: AWS Bedrock integration via Vercel AI SDK
- 📚 **Knowledge Base Support**: Query specific knowledge bases through Bedrock Agents
- 🔄 **Streaming Responses**: Real-time streaming AI responses
- 🔧 **Hybrid Architecture**: Automatic fallback from Bedrock Agent to direct model access
- 🎯 **Enhanced Mentions**: Pattern-based mention handling with smart responses
- 📝 **Natural Chat Interface**: Support for mentions and intuitive text patterns
- ☁️ **Serverless Ready**: Deploy as AWS Lambda functions with Serverless Framework

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- AWS Account with Bedrock access
- Slack App with Bot Token
- Serverless Framework (for Lambda deployment)

## Quick Start

### Socket Mode (Development)

#### 1. Clone and Install

```bash
git clone <your-repo-url>
cd acorn
npm install
```

#### 2. Environment Setup

Copy the example environment file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Slack Bot Configuration (Required)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# AWS Credentials (Required)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
# OR use AWS Profile instead
# AWS_PROFILE=default

# AI Model Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Knowledge Base Configuration (for RetrieveAndGenerate)
BEDROCK_KNOWLEDGE_BASE_IDS=kb-12345678,kb-87654321
```

#### 3. Slack App Setup

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create a new app or select existing one
3. Enable **Socket Mode** and generate an App Token
4. Add Bot Token Scopes:
   - `app_mentions:read`
   - `channels:history`
   - `chat:write`
5. Install app to your workspace
6. Copy tokens to your `.env` file

#### 4. AWS Bedrock Setup

1. Enable Bedrock service in your AWS account
2. Request access to Claude models in Bedrock console
3. Create Bedrock Knowledge Bases for RetrieveAndGenerate
4. Configure AWS credentials in `.env`

#### 5. Run the Bot

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

### Serverless Deployment (Production)

For production deployments, the bot can be deployed as AWS Lambda functions using the Serverless Framework.

#### 1. Install Serverless Framework

```bash
npm install -g serverless
```

#### 2. AWS Credentials Setup

Configure AWS credentials for Serverless:

```bash
# Option 1: AWS CLI (recommended)
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1

# Option 3: AWS Profile
export AWS_PROFILE=your-profile-name
```

#### 3. Environment Configuration

Create environment files for different stages:

**Development Stage** (`.env.dev`):

```env
SLACK_BOT_TOKEN=xoxb-your-dev-bot-token
SLACK_SIGNING_SECRET=your-dev-signing-secret
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
# Optional: Knowledge base IDs for RetrieveAndGenerate
BEDROCK_KNOWLEDGE_BASE_IDS=kb-dev-123,kb-dev-456
NODE_ENV=development
LOG_LEVEL=debug
```

**Production Stage** (`.env.prod`):

```env
SLACK_BOT_TOKEN=xoxb-your-prod-bot-token
SLACK_SIGNING_SECRET=your-prod-signing-secret
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
# Optional: Knowledge base IDs for RetrieveAndGenerate
BEDROCK_KNOWLEDGE_BASE_IDS=kb-prod-123,kb-prod-456
NODE_ENV=production
LOG_LEVEL=info
```

#### 4. Slack App Configuration for HTTP Events

For serverless deployment, configure your Slack app to use HTTP events instead of Socket Mode:

1. Go to your Slack App settings
2. **Disable Socket Mode**
3. Configure **Event Subscriptions**:

   - Enable Events: Yes
   - Request URL: `https://your-api-gateway-url.amazonaws.com/dev/slack/events`
   - Subscribe to Bot Events:
     - `app_mention`
     - `message.channels`
     - `message.groups`
     - `message.im`
     - `message.mpim`

#### 5. Deploy to AWS

Deploy to development stage:

```bash
npm run deploy:dev
```

Deploy to production stage:

```bash
npm run deploy:prod
```

Deploy with custom stage:

```bash
npx serverless deploy --stage staging
```

#### 6. Update Slack App URLs

After deployment, Serverless will output the API Gateway URLs. Update your Slack app configuration with these URLs:

````
✅ Service deployed to stack acorn-slack-bot-dev
endpoints:
  ```bash
  POST - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/slack/events
  GET - https://abc123xyz.execute-api.us-east-1.amazonaws.com/dev/health
````

Copy the events URL to your Slack app configuration.

````

Copy these URLs to your Slack app configuration.

#### 7. Test Deployment

Test the health endpoint:

```bash
curl https://your-api-gateway-url.amazonaws.com/dev/health
````

Should return:

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z", "version": "1.0.0" }
```

#### 8. Monitor Logs

View Lambda logs:

```bash
npm run logs:dev
# or
npm run logs:prod
```

View specific function logs:

```bash
npx serverless logs -f slack-events --stage dev
```

#### 9. Remove Deployment

To remove the serverless deployment:

```bash
npm run remove:dev
# or
npm run remove:prod
```

### Deployment Architecture

The serverless deployment creates:

- **2 Lambda Functions**:

  - `slack-events`: Handles all Slack Events API interactions (messages, mentions, etc.)
  - `health`: Health check endpoint

- **API Gateway**: HTTP API with CORS enabled
- **IAM Roles**: Proper permissions for Bedrock access
- **CloudWatch Logs**: Log groups with retention policies

## Usage

### Basic Interactions

**Ask Questions (Natural Chat):**

```
ask: What is the company policy on remote work?
@acorn How do I submit expenses?
@acorn What are the office hours?
```

**Streaming Responses:**

```
stream: Explain machine learning concepts
@acorn stream: Tell me about quantum computing
```

**Knowledge Base Queries:**

```
ask kb1: What are the security guidelines?
ask kb2: Company handbook information
```

**Enhanced Mentions:**

```
@acorn hello                    # Smart greeting
@acorn help                     # Show usage help
@acorn status                   # Check bot health
@acorn info                     # View configuration details
@acorn stream: explain AI       # Stream response via mention
@acorn thanks                   # Friendly acknowledgment
```

**Bot Status & Info:**

```
@acorn status - Check bot and AI service status
@acorn info - View configuration and usage help
status - Works in channels too
info - Also works in channels
```

### Available Chat Patterns

| Pattern                     | Description                                 |
| --------------------------- | ------------------------------------------- |
| `ask: <question>`           | Ask the AI a question                       |
| `ask kb1: <question>`       | Query specific knowledge base               |
| `stream: <question>`        | Get streaming AI response                   |
| `@acorn <anything>`         | Mention-based interaction (smart responses) |
| `status` or `@acorn status` | Show bot status and uptime                  |
| `info` or `@acorn info`     | Display AI configuration                    |
| `help` or `@acorn help`     | Show usage instructions                     |

## Configuration Options

### Deployment Modes

The bot supports two deployment modes:

1. **Socket Mode (Development)**:

   - Direct WebSocket connection to Slack
   - Requires `SLACK_APP_TOKEN`
   - Ideal for development and testing
   - Run with `npm run dev` or `npm start`

2. **HTTP Mode (Production/Serverless)**:
   - HTTP API endpoints for Slack Events
   - Deployed as AWS Lambda functions
   - Production-ready with auto-scaling
   - Deploy with `npm run deploy:dev` or `npm run deploy:prod`

### AI Service Modes

The bot operates in two modes:

1. **RetrieveAndGenerate Mode** (when `BEDROCK_KNOWLEDGE_BASE_IDS` is set):

   - Uses Bedrock RetrieveAndGenerate API with knowledge base integration
   - Session-based context tracking
   - Automatic source citation from knowledge bases
   - Enhanced retrieval with configurable result count

2. **AI SDK Fallback Mode** (when no knowledge bases configured):
   - Direct model access via Vercel AI SDK
   - Streaming support
   - General AI conversations

### Environment Variables

| Variable                     | Required    | Description                                                |
| ---------------------------- | ----------- | ---------------------------------------------------------- |
| `SLACK_BOT_TOKEN`            | Yes         | Slack bot token (xoxb-...)                                 |
| `SLACK_SIGNING_SECRET`       | Yes         | Slack app signing secret                                   |
| `SLACK_APP_TOKEN`            | Socket Mode | Slack app token (xapp-...) for Socket Mode                 |
| `AWS_REGION`                 | Yes         | AWS region (default: us-east-1)                            |
| `AWS_ACCESS_KEY_ID`          | Yes\*       | AWS access key                                             |
| `AWS_SECRET_ACCESS_KEY`      | Yes\*       | AWS secret key                                             |
| `AWS_PROFILE`                | Yes\*       | AWS profile (alternative to keys)                          |
| `BEDROCK_MODEL_ID`           | No          | Bedrock model ID (default: Claude 3 Sonnet)                |
| `BEDROCK_KNOWLEDGE_BASE_IDS` | No          | Comma-separated knowledge base IDs for RetrieveAndGenerate |
| `PORT`                       | No          | Server port (default: 3000, Socket Mode only)              |
| `NODE_ENV`                   | No          | Environment (development/production)                       |
| `LOG_LEVEL`                  | No          | Logging level (info/debug/error)                           |

\*Either AWS keys OR AWS profile required

### Available npm Scripts

| Script                | Description                                   |
| --------------------- | --------------------------------------------- |
| `npm start`           | Run in Socket Mode (production)               |
| `npm run dev`         | Run in Socket Mode (development with nodemon) |
| `npm run deploy:dev`  | Deploy to AWS Lambda (dev stage)              |
| `npm run deploy:prod` | Deploy to AWS Lambda (prod stage)             |
| `npm run logs:dev`    | View Lambda logs (dev stage)                  |
| `npm run logs:prod`   | View Lambda logs (prod stage)                 |
| `npm run remove:dev`  | Remove serverless deployment (dev stage)      |
| `npm run remove:prod` | Remove serverless deployment (prod stage)     |
| `npm test`            | Run test suite                                |
| `npm run lint`        | Run ESLint                                    |
| `npm run lint:fix`    | Fix ESLint issues                             |

## Testing

### Manual Testing

1. Invite the bot to a Slack channel
2. Test basic functionality:
   ```
   @acorn hello
   ask: What is 2+2?
   stream: Explain photosynthesis
   @acorn status
   ```

### Running Tests

```bash
# Run test suite
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Health Check

Check if the bot is working correctly:

1. **Bot Status**: `@acorn status` - Should show "Running ✅"
2. **AI Services**: Check if Bedrock Agent and AI SDK are configured
3. **Basic Query**: `ask: Hello` - Should get AI response
4. **Streaming**: `stream: Count to 5` - Should see real-time updates

## Troubleshooting

### Common Issues

**Bot doesn't respond (Socket Mode):**

- Check Slack tokens are correct
- Verify bot is invited to the channel
- Check Socket Mode is enabled
- Review logs for error messages

**Bot doesn't respond (Serverless):**

- Check Slack Event URLs are configured correctly
- Verify Socket Mode is disabled
- Check API Gateway endpoints are accessible
- Review CloudWatch logs for errors

**AI responses fail:**

- Verify AWS credentials and region
- Check Bedrock model access in AWS console
- Ensure model ID is correct
- Check CloudWatch logs for AWS errors

**Agent queries fail:**

- Verify `BEDROCK_AGENT_ID` is correct
- Check agent is deployed and active
- Verify knowledge base IDs exist
- Review agent permissions

**Streaming doesn't work:**

- Check if bot has `chat:write` permission
- Verify message update permissions in Slack
- Check for rate limiting

**Serverless deployment fails:**

- Verify AWS credentials are configured
- Check IAM permissions for CloudFormation
- Ensure Serverless Framework is installed
- Review deployment logs for specific errors

### Logs and Debugging

**Socket Mode:**
Enable debug logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

View application logs:

```bash
npm run dev
```

**Serverless Mode:**
View Lambda logs:

```bash
npm run logs:dev
# or specific function
npx serverless logs -f slack-events --stage dev --tail
```

**AWS CloudWatch:**

- Navigate to CloudWatch in AWS Console
- Check Log Groups: `/aws/lambda/acorn-slack-bot-{stage}-{function}`
- Look for errors and exceptions

## Development

### Project Structure

```
src/
├── app.js                 # Main application entry (Socket Mode)
├── lambda/                # Serverless Lambda handlers
│   ├── slack-adapter.js   # Slack App adapter for Lambda
│   ├── slack-events.js    # Events API Lambda handler
│   ├── health.js          # Health check handler
│   └── utils.js           # Lambda utilities
├── handlers/              # Slack event handlers (shared)
│   ├── messageHandler.js  # Direct message patterns
│   ├── eventHandler.js    # Slack events (joins, reactions)
│   ├── aiHandler.js       # AI text patterns (ask:, stream:, kb queries)
│   └── mentionHandler.js  # Enhanced mention handling
├── services/              # External services
│   └── aiService.js       # Unified AI service (Bedrock Agent + AI SDK)
└── utils/                 # Utilities
    ├── logger.js          # Logging utility
    └── responses.js       # Response utilities
```

### Serverless Configuration

- `serverless.yml`: Main serverless configuration
- `.env.dev`, `.env.prod`: Environment-specific configurations
- `scripts/`: Deployment automation scripts

### Adding New Features

1. For AI features: Extend `aiHandler.js` with new text patterns, or `mentionHandler.js` for mention-based interactions
2. For utility features: Add to `messageHandler.js` or `eventHandler.js`
3. Register new handlers in `src/app.js`
4. Use `aiService.query()` or `aiService.stream()` for AI interactions
5. Follow existing error handling patterns and comprehensive logging
6. Update documentation

### Contributing

1. Fork the repository
2. Create feature branch
3. Follow existing code patterns
4. Add tests for new functionality
5. Update documentation
6. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:

- Check troubleshooting section above
- Review application logs
- Check AWS CloudWatch for Bedrock errors
- Verify Slack app configuration
