// Jest setup file
// Mock environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
process.env.AWS_REGION = 'us-east-1';

// Mock fetch for API calls
global.fetch = jest.fn();

// Silence console.log during tests unless needed
const originalConsole = global.console;
beforeEach(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: originalConsole.error, // Keep errors visible
  };
});

afterEach(() => {
  global.console = originalConsole;
  jest.clearAllMocks();
});