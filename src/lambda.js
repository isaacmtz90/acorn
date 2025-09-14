const { createEventHandler } = require('./slack/eventHandler');
const { verifySlackSignature } = require('./slack/verify');
const { logger } = require('./utils/logger');

// Lambda handler for Slack events
exports.handler = async (event, context) => {
  logger.info('Lambda invocation:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    requestId: context.awsRequestId
  });

  try {
    // Parse the request body
    const body = event.body;
    const parsedBody = JSON.parse(body);
    
    // Get Slack headers
    const timestamp = event.headers['X-Slack-Request-Timestamp'] || event.headers['x-slack-request-timestamp'];
    const signature = event.headers['X-Slack-Signature'] || event.headers['x-slack-signature'];
    
    logger.info('Slack event received:', {
      type: parsedBody.type,
      eventType: parsedBody.event?.type,
      timestamp: timestamp,
      hasSignature: !!signature
    });

    // Handle URL verification challenge
    if (parsedBody.type === 'url_verification') {
      logger.info('URL verification challenge received');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain',
        },
        body: parsedBody.challenge,
      };
    }

    // Verify Slack signature for security
    if (!verifySlackSignature(body, signature, timestamp)) {
      logger.error('Invalid Slack signature');
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Handle Slack events
    const result = await createEventHandler(parsedBody, {
      requestId: context.awsRequestId,
      headers: event.headers
    });

    logger.info('Event processed successfully:', {
      requestId: context.awsRequestId,
      resultType: typeof result
    });

    // Return success response to Slack
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result || { ok: true }),
    };

  } catch (error) {
    logger.error('Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        requestId: context.awsRequestId 
      }),
    };
  }
};