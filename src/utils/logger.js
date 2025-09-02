const logger = {
  info: (message, ...args) => {
    console.log(`[${new Date().toISOString()}] INFO:`, message, ...args);
  },
  
  error: (message, ...args) => {
    console.error(`[${new Date().toISOString()}] ERROR:`, message, ...args);
  },
  
  warn: (message, ...args) => {
    console.warn(`[${new Date().toISOString()}] WARN:`, message, ...args);
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      console.log(`[${new Date().toISOString()}] DEBUG:`, message, ...args);
    }
  }
};

module.exports = { logger };