# Acorn Slack Bot

A Slack chatbot application built with Node.js using the Slack Bolt framework, integrated with AWS Bedrock for intelligent Q&A capabilities using Vercel's AI SDK.

## Features

- 🤖 **Slack Integration**: Full Slack Bot API support with Socket Mode
- 🧠 **AI-Powered Responses**: AWS Bedrock integration via Vercel AI SDK
- 📚 **Knowledge Base Support**: Query specific knowledge bases through Bedrock Agents
- 🔄 **Streaming Responses**: Real-time streaming AI responses
- 🔧 **Hybrid Architecture**: Automatic fallback from Bedrock Agent to direct model access
- 🎯 **Enhanced Mentions**: Pattern-based mention handling with smart responses
- 📝 **Natural Chat Interface**: Support for mentions and intuitive text patterns

## Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager
- AWS Account with Bedrock access
- Slack App with Bot Token

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd acorn
npm install
```

### 2. Environment Setup

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

### 3. Slack App Setup

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create a new app or select existing one
3. Enable **Socket Mode** and generate an App Token
4. Add Bot Token Scopes:
   - `app_mentions:read`
   - `channels:history` 
   - `chat:write`
5. Install app to your workspace
6. Copy tokens to your `.env` file

### 4. AWS Bedrock Setup

1. Enable Bedrock service in your AWS account
2. Request access to Claude models in Bedrock console
3. Create Bedrock Knowledge Bases for RetrieveAndGenerate
4. Configure AWS credentials in `.env`

### 5. Run the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

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

| Pattern | Description |
|---------|-------------|
| `ask: <question>` | Ask the AI a question |
| `ask kb1: <question>` | Query specific knowledge base |
| `stream: <question>` | Get streaming AI response |
| `@acorn <anything>` | Mention-based interaction (smart responses) |
| `status` or `@acorn status` | Show bot status and uptime |
| `info` or `@acorn info` | Display AI configuration |
| `help` or `@acorn help` | Show usage instructions |

## Configuration Options

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

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Slack bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | Slack app signing secret |
| `SLACK_APP_TOKEN` | Yes | Slack app token (xapp-...) |
| `AWS_REGION` | Yes | AWS region (default: us-east-1) |
| `AWS_ACCESS_KEY_ID` | Yes* | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes* | AWS secret key |
| `AWS_PROFILE` | Yes* | AWS profile (alternative to keys) |
| `BEDROCK_MODEL_ID` | No | Bedrock model ID (default: Claude 3 Sonnet) |
| `BEDROCK_KNOWLEDGE_BASE_IDS` | No | Comma-separated knowledge base IDs for RetrieveAndGenerate |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `LOG_LEVEL` | No | Logging level (info/debug/error) |

*Either AWS keys OR AWS profile required

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

**Bot doesn't respond:**
- Check Slack tokens are correct
- Verify bot is invited to the channel
- Check Socket Mode is enabled
- Review logs for error messages

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

### Logs and Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

View application logs:
```bash
# In development
npm run dev

# Check specific errors
grep ERROR logs/app.log
```

## Development

### Project Structure

```
src/
├── app.js                 # Main application entry
├── handlers/              # Slack event handlers
│   ├── messageHandler.js  # Direct message patterns
│   ├── eventHandler.js    # Slack events (joins, reactions)
│   ├── aiHandler.js       # AI text patterns (ask:, stream:, kb queries)
│   └── mentionHandler.js  # Enhanced mention handling
├── services/              # External services
│   └── aiService.js       # Unified AI service (Bedrock Agent + AI SDK)
└── utils/                 # Utilities
    └── logger.js          # Logging utility
```

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