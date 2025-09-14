// HTTP Mode Slack App for Lambda
// This replaces the Socket Mode version for serverless deployment

require('dotenv').config();

const { logger } = require('./utils/logger');
const aiService = require('./services/aiService');

// For local testing with Express (Lambda uses different entry point)
if (require.main === module) {
  startLocalServer();
}

/**
 * Local development server using Express
 * For production, use src/lambda.js as the Lambda handler
 */
async function startLocalServer() {
  const express = require('express');
  const { createEventHandler } = require('./slack/eventHandler');
  const { verifySlackSignature } = require('./slack/verify');
  
  const app = express();
  const port = process.env.PORT || 3000;

  // Middleware
  app.use('/slack/events', express.raw({ type: 'application/json' }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    const aiStatus = aiService.getStatus();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      ai: aiStatus
    });
  });

  // Slack events endpoint
  app.post('/slack/events', async (req, res) => {
    try {
      const body = req.body.toString();
      const parsedBody = JSON.parse(body);
      
      // Get Slack headers
      const timestamp = req.headers['x-slack-request-timestamp'];
      const signature = req.headers['x-slack-signature'];
      
      logger.info('Slack event received:', {
        type: parsedBody.type,
        eventType: parsedBody.event?.type,
        timestamp: timestamp,
        hasSignature: !!signature
      });

      // Handle URL verification challenge
      if (parsedBody.type === 'url_verification') {
        logger.info('URL verification challenge received');
        return res.status(200).send(parsedBody.challenge);
      }

      // Verify Slack signature for security
      if (!verifySlackSignature(body, signature, timestamp)) {
        logger.error('Invalid Slack signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Handle Slack events
      const result = await createEventHandler(parsedBody, {
        requestId: req.headers['x-request-id'] || 'local-' + Date.now(),
        headers: req.headers
      });

      logger.info('Event processed successfully');
      res.status(200).json(result || { ok: true });

    } catch (error) {
      logger.error('Error processing Slack event:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  });

  // Start server
  app.listen(port, () => {
    console.log(`🏥 HTTP Mode Acorn Slack bot running on port ${port}`);
    console.log(`📡 Slack events endpoint: http://localhost:${port}/slack/events`);
    console.log(`🩺 Health check: http://localhost:${port}/health`);
    console.log(`🔧 For production deployment, use src/lambda.js`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📊 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('📊 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });
}

module.exports = {
  startLocalServer
};