import { logger } from "../utils/logger";
import { createResponse, handleCorsPrelight } from "../utils/lambdaUtils";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  functionName: string;
  region: string;
  requestId: string;
  memoryLimit: number;
  remainingTime?: number;
  uptime: number;
  nodeVersion: string;
  platform: string;
  checks: {
    environment: EnvironmentCheck;
    memory: MemoryCheck;
  };
  error?: string;
}

interface EnvironmentCheck {
  status: "pass" | "fail";
  missingVariables: string[];
  optionalVariables: {
    SLACK_APP_TOKEN: boolean;
    BEDROCK_MODEL_ID: boolean;
    BEDROCK_AGENT_ID: boolean;
    BEDROCK_KNOWLEDGE_BASE_IDS: boolean;
  };
}

interface MemoryCheck {
  status: "pass" | "warn";
  used: string;
  limit: string;
  percentage: string;
  details: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external: string;
  };
}

/**
 * AWS Lambda handler for health check endpoint
 */
export const handler = async (event: any, context: any) => {
  try {
    logger.info("Health check request received", {
      requestId: context.awsRequestId,
      functionName: context.functionName,
    });

    // Handle CORS preflight requests
    const corsResponse = handleCorsPrelight(event);
    if (corsResponse) {
      return corsResponse;
    }

    // Basic health check response
    const healthStatus: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "acorn-slack-bot",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      functionName: context.functionName,
      region: process.env.AWS_REGION || "unknown",
      requestId: context.awsRequestId,
      memoryLimit: context.memoryLimitInMB,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      checks: {
        environment: checkEnvironmentVariables(),
        memory: checkMemoryUsage(),
      },
    };

    // Add remainingTime only if available
    const remainingTime = context.getRemainingTimeInMillis?.();
    if (remainingTime !== undefined) {
      healthStatus.remainingTime = remainingTime;
    }

    logger.info("Health check completed successfully");
    return createResponse(200, healthStatus);
  } catch (error: any) {
    logger.error("Health check failed:", error);

    const errorResponse = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      requestId: context.awsRequestId,
    };

    return createResponse(503, errorResponse);
  }
};

/**
 * Check if required environment variables are present
 */
function checkEnvironmentVariables(): EnvironmentCheck {
  const requiredVars = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  return {
    status: missingVars.length === 0 ? "pass" : "fail",
    missingVariables: missingVars,
    optionalVariables: {
      SLACK_APP_TOKEN: !!process.env.SLACK_APP_TOKEN,
      BEDROCK_MODEL_ID: !!process.env.BEDROCK_MODEL_ID,
      BEDROCK_AGENT_ID: !!process.env.BEDROCK_AGENT_ID,
      BEDROCK_KNOWLEDGE_BASE_IDS: !!process.env.BEDROCK_KNOWLEDGE_BASE_IDS,
    },
  };
}

/**
 * Check memory usage
 */
function checkMemoryUsage(): MemoryCheck {
  const memUsage = process.memoryUsage();
  const limitMB = parseInt(
    process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || "512"
  );
  const usedMB = Math.round(memUsage.rss / 1024 / 1024);
  const usagePercent = Math.round((usedMB / limitMB) * 100);

  return {
    status: usagePercent < 80 ? "pass" : "warn",
    used: `${usedMB} MB`,
    limit: `${limitMB} MB`,
    percentage: `${usagePercent}%`,
    details: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
    },
  };
}
