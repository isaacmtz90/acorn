# AWS Lambda Deployment Guide

This guide walks you through deploying the Acorn Slack Bot to AWS Lambda using AWS SAM (Serverless Application Model).

## Architecture Overview

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│     Slack       │───▶│ API Gateway  │───▶│  Lambda Function│
│   (HTTP Events) │    │   (HTTPS)    │    │   (Node.js)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │  AWS Bedrock    │
                                            │ (AI Services)   │
                                            └─────────────────┘
```

## Prerequisites

### 1. Install Required Tools
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# AWS SAM CLI
# macOS
brew install aws-sam-cli

# Linux
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

### 2. Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region (us-east-1)
```

### 3. Update Slack App Configuration

**CRITICAL: Switch from Socket Mode to HTTP Events**

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your app
3. **Disable Socket Mode**:
   - Go to "Socket Mode" 
   - Turn off "Enable Socket Mode"
4. **Enable Event Subscriptions**:
   - Go to "Event Subscriptions"
   - Turn on "Enable Events"
   - Request URL will be provided after deployment
5. **Update Bot Token Scopes** (if needed):
   - Go to "OAuth & Permissions"
   - Ensure these scopes are enabled:
     - `chat:write`
     - `app_mentions:read`
     - `channels:read`
     - `im:read`
     - `im:write`

## Deployment Steps

### Option A: Quick Deploy (Recommended for Dev)

1. **Set Environment Variables**:
   ```bash
   export SLACK_BOT_TOKEN="xoxb-your-bot-token"
   export SLACK_SIGNING_SECRET="your-signing-secret"
   export BEDROCK_MODEL_ID="anthropic.claude-3-sonnet-20240229-v1:0"  # Optional
   export BEDROCK_AGENT_ID="your-agent-id"  # Optional
   export BEDROCK_KNOWLEDGE_BASE_IDS="kb1,kb2,kb3"  # Optional
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   ```

### Option B: Guided Deploy (First Time)

```bash
npm run deploy:guided
```

This will prompt you for all required parameters interactively.

### Option C: Production Deploy

```bash
# Set production environment variables
export SLACK_BOT_TOKEN="xoxb-your-prod-token"
export SLACK_SIGNING_SECRET="your-prod-signing-secret"

# Deploy to production
npm run deploy:prod
```

## Post-Deployment Configuration

### 1. Configure Slack App

After successful deployment, you'll get outputs like:
```
SlackEventsUrl: https://abc123.execute-api.us-east-1.amazonaws.com/dev/slack/events
```

1. Copy the `SlackEventsUrl` 
2. Go to your Slack app settings
3. **Event Subscriptions** → **Request URL** → Paste the URL
4. **Subscribe to Bot Events**:
   - `app_mention`
   - `message.channels`
   - `message.im`
   - `member_joined_channel` (optional)
   - `reaction_added` (optional)

### 2. Test Your Bot

1. Invite the bot to a channel: `/invite @acorn`
2. Test with: `@acorn hello`
3. Test AI: `@acorn what is machine learning?`
4. Test patterns: `ask: what is AWS Lambda?`

## Available Commands

### Development
```bash
# Local development (HTTP mode)
npm start

# Local development (Socket mode - original)
npm start:socket

# Validate SAM template
npm run validate

# Build application
npm run build

# Run SAM locally (requires Docker)
npm run local
```

### Deployment
```bash
# Deploy to dev environment
npm run deploy

# Deploy to staging
npm run deploy:staging  

# Deploy to production
npm run deploy:prod

# Guided deployment (interactive)
npm run deploy:guided
```

### Monitoring
```bash
# Tail CloudWatch logs
npm run logs

# View specific log group
sam logs --tail --stack-name acorn-slack-bot-dev --filter ERROR
```

## Environment Management

### Development Environment
- **Stack**: `acorn-slack-bot-dev`
- **URL**: `https://*.execute-api.us-east-1.amazonaws.com/dev/slack/events`
- **Logs**: `/aws/lambda/acorn-slack-bot-dev`

### Staging Environment  
- **Stack**: `acorn-slack-bot-staging`
- **URL**: `https://*.execute-api.us-east-1.amazonaws.com/staging/slack/events`

### Production Environment
- **Stack**: `acorn-slack-bot-prod`  
- **URL**: `https://*.execute-api.us-east-1.amazonaws.com/prod/slack/events`
- **Requires manual approval** for deployments

## Key Differences from Socket Mode

| Feature | Socket Mode | Lambda HTTP Mode |
|---------|-------------|------------------|
| **Connection** | Persistent WebSocket | HTTP Request/Response |
| **Streaming** | Real-time updates | Async message updates |
| **Latency** | Lower (~100ms) | Higher (1-3s cold start) |
| **Cost** | Always running | Pay per request |
| **Scaling** | Manual | Automatic |
| **Security** | Connection-based | Signature verification |

## Architecture Benefits

✅ **Cost Effective**: ~$8-15/month vs ~$70-90 for containers  
✅ **Auto Scaling**: Handles 1000+ concurrent requests  
✅ **Zero Maintenance**: No server management  
✅ **High Security**: Request signature verification  
✅ **Built-in Monitoring**: CloudWatch integration  
✅ **Compliance Ready**: SOC, PCI DSS, HIPAA eligible  

## Troubleshooting

### Common Issues

1. **"Invalid signature" errors**:
   - Check `SLACK_SIGNING_SECRET` is correct
   - Verify Slack app configuration

2. **"Challenge failed" during URL verification**:
   - Check API Gateway URL is correct
   - Ensure Lambda has proper permissions

3. **Bot not responding**:
   - Check CloudWatch logs: `npm run logs`
   - Verify Event Subscriptions are configured
   - Check Bot Token Scopes

4. **Lambda timeout**:
   - Default 15 minutes should be sufficient
   - Check AI processing time in logs

### View Logs
```bash
# Real-time logs
aws logs tail /aws/lambda/acorn-slack-bot-dev --follow

# Filter errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/acorn-slack-bot-dev \
  --filter-pattern "ERROR"
```

### Debug Locally
```bash
# Start local API
npm run local

# Test with curl
curl -X POST http://localhost:3000/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

## Cost Optimization

### Lambda Pricing (us-east-1)
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Free Tier**: 1M requests + 400,000 GB-seconds/month

### Example Monthly Costs
- **Light usage** (10K requests): ~$2
- **Moderate usage** (100K requests): ~$8  
- **Heavy usage** (1M requests): ~$15

### API Gateway Pricing
- **REST API**: $3.50 per 1M requests
- **HTTP API**: $1.00 per 1M requests (consider migrating)

## Security Features

🔒 **Request Verification**: All requests verified with Slack signature  
🔒 **IAM Permissions**: Least privilege access to AWS services  
🔒 **Encryption**: All data encrypted in transit and at rest  
🔒 **VPC Support**: Can run in private subnets (optional)  
🔒 **Dead Letter Queue**: Failed requests captured for analysis  
🔒 **CloudWatch Monitoring**: Full request/response logging  

## Cleanup

To remove all AWS resources:
```bash
sam delete --stack-name acorn-slack-bot-dev
```

## Support

- **AWS SAM Issues**: [SAM GitHub](https://github.com/aws/aws-sam-cli)
- **Slack API Issues**: [Slack API Docs](https://api.slack.com/docs)
- **AWS Lambda Limits**: [Lambda Quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)