#!/bin/bash

# Script to load environment variables to AWS SSM Parameter Store
# Usage: ./scripts/load-ssm-parameters.sh [stage] [env-file]
# Example: ./scripts/load-ssm-parameters.sh dev .env.dev

set -e

# Default values
STAGE=${1:-dev}
ENV_FILE=${2:-.env.${STAGE}}
SERVICE_NAME="acorn_bot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Loading SSM parameters for ${SERVICE_NAME}/${STAGE}${NC}"
echo -e "${YELLOW}Using environment file: ${ENV_FILE}${NC}"

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file $ENV_FILE not found${NC}"
    exit 1
fi

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Function to put parameter
put_parameter() {
    local param_name=$1
    local param_value=$2
    local param_type=$3
    local description=$4
    
    echo -e "Setting parameter: ${param_name}"
    
    aws ssm put-parameter \
        --name "${param_name}" \
        --value "${param_value}" \
        --type "${param_type}" \
        --description "${description}" \
        --overwrite \
        --no-cli-pager || {
        echo -e "${RED}Failed to set parameter: ${param_name}${NC}"
        return 1
    }
}

# Read .env file and extract variables
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue
    fi
    
    # Extract key=value pairs
    if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        
        # Remove quotes if present
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        
        case $key in
            "SLACK_BOT_TOKEN")
                put_parameter "/acorn_${STAGE}_slack_token" "$value" "SecureString" "Slack Bot Token for ${STAGE}"
                ;;
            "SLACK_SIGNING_SECRET")
                put_parameter "/acorn_${STAGE}_slack_secret" "$value" "SecureString" "Slack Signing Secret for ${STAGE}"
                ;;
            "SLACK_APP_TOKEN")
                put_parameter "/acorn_${STAGE}_app_token" "$value" "SecureString" "Slack App Token for ${STAGE}"
                ;;
            "BEDROCK_MODEL_ID")
                put_parameter "/acorn_${STAGE}_bedrock_model" "$value" "String" "Bedrock Model ID for ${STAGE}"
                ;;
            "BEDROCK_AGENT_ID")
                put_parameter "/acorn_${STAGE}_bedrock_agent" "$value" "String" "Bedrock Agent ID for ${STAGE}"
                ;;
            "BEDROCK_AGENT_ALIAS_ID")
                put_parameter "/acorn_${STAGE}_bedrock_alias" "$value" "String" "Bedrock Agent Alias ID for ${STAGE}"
                ;;
            "BEDROCK_ENABLE_TRACE")
                put_parameter "/acorn_${STAGE}_bedrock_trace" "$value" "String" "Bedrock Enable Trace for ${STAGE}"
                ;;
            "BEDROCK_KNOWLEDGE_BASE_IDS")
                put_parameter "/acorn_${STAGE}_bedrock_kb" "$value" "String" "Bedrock Knowledge Base IDs for ${STAGE}"
                ;;
            *)
                echo -e "${YELLOW}Skipping parameter: ${key} (not needed for Lambda deployment)${NC}"
                ;;
        esac
    fi
done < "$ENV_FILE"

echo -e "${GREEN}✅ Successfully loaded all parameters to SSM Parameter Store${NC}"
echo -e "${YELLOW}Note: You can now remove sensitive values from your .env files${NC}"
