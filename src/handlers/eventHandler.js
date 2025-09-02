const { logger } = require('../utils/logger');

module.exports = (app) => {
  // Note: app_mention is handled in aiHandler.js
  
  app.event('member_joined_channel', async ({ event, say }) => {
    try {
      await say(`*chittering excitedly while gathering welcome acorns* Welcome to our tree, <@${event.user}>! 🐿️🌰 I was just organizing my nut collection when I saw you arrive! Make yourself at home! 🎉`);
      logger.info(`New member joined: ${event.user}`);
    } catch (error) {
      logger.error('Error handling member joined:', error);
    }
  });

  app.event('reaction_added', async ({ event }) => {
    try {
      logger.info(`Reaction added: ${event.reaction} by ${event.user}`);
    } catch (error) {
      logger.error('Error handling reaction added:', error);
    }
  });
};