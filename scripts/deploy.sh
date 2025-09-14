#!/bin/bash

# Deploy Acorn Slack Bot to AWS Lambda
# Usage: ./scripts/deploy.sh [environment] [--guided]

set -e

ENVIRONMENT=${1:-dev}
GUIDED=${2}

echo "🚀 Deploying Acorn Slack Bot to AWS Lambda..."
echo "📍 Environment: $ENVIRONMENT"
echo "🏗️  Region: ${AWS_REGION:-us-east-1}"

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ SAM CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Validate template
echo "🔍 Validating SAM template..."
sam validate

# Build the application
echo "🏗️  Building application..."
sam build --cached --parallel

# Check for required parameters
if [ -z "$SLACK_BOT_TOKEN" ] || [ -z "$SLACK_SIGNING_SECRET" ]; then
    echo "⚠️  Required environment variables not set:"
    echo "   SLACK_BOT_TOKEN - Your Slack Bot Token (xoxb-...)"
    echo "   SLACK_SIGNING_SECRET - Your Slack Signing Secret"
    echo ""
    echo "🔧 Set them in your environment or pass via --parameter-overrides"
    
    if [ "$GUIDED" == "--guided" ]; then
        echo "📝 Running guided deployment..."
        sam deploy --guided --config-env $ENVIRONMENT
    else
        echo "💡 Use --guided flag for interactive parameter input"
        echo "   ./scripts/deploy.sh $ENVIRONMENT --guided"
        exit 1
    fi
else
    # Deploy with environment variables
    echo "🚀 Deploying to $ENVIRONMENT environment..."
    sam deploy \
        --config-env $ENVIRONMENT \
        --parameter-overrides \
            "SlackBotToken=$SLACK_BOT_TOKEN" \
            "SlackSigningSecret=$SLACK_SIGNING_SECRET" \
            "BedrockModelId=${BEDROCK_MODEL_ID:-anthropic.claude-3-sonnet-20240229-v1:0}" \
            "BedrockAgentId=${BEDROCK_AGENT_ID:-}" \
            "BedrockKnowledgeBaseIds=${BEDROCK_KNOWLEDGE_BASE_IDS:-}"
fi

# Get outputs
echo "📋 Deployment outputs:"
aws cloudformation describe-stacks \
    --stack-name "acorn-slack-bot-$ENVIRONMENT" \
    --query 'Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}' \
    --output table

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Next steps:"
echo "1. Copy the Slack Events URL from the outputs above"
echo "2. Configure your Slack app Event Subscriptions:"
echo "   - Go to https://api.slack.com/apps"
echo "   - Select your app"
echo "   - Go to 'Event Subscriptions'"
echo "   - Enable Events and paste the Slack Events URL"
echo "   - Subscribe to bot events: app_mention, message.channels, message.im"
echo "3. Test your bot by mentioning @acorn in Slack"