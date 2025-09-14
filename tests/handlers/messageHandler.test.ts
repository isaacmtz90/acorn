import { registerMessageHandlers } from '../../src/handlers/messageHandler';

describe('MessageHandler', () => {
  let mockApp: any;
  let mockSay: jest.Mock;
  let mockMessage: any;

  beforeEach(() => {
    mockSay = jest.fn();
    mockMessage = {
      user: 'U123456',
      ts: '1234567890.123',
      text: '',
    };

    mockApp = {
      message: jest.fn(),
    };
  });

  describe('registerMessageHandlers', () => {
    it('should register all message handlers', () => {
      registerMessageHandlers(mockApp);

      expect(mockApp.message).toHaveBeenCalledTimes(3);
      expect(mockApp.message).toHaveBeenCalledWith('hello', expect.any(Function));
      expect(mockApp.message).toHaveBeenCalledWith(/help/i, expect.any(Function));
      expect(mockApp.message).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('hello message handler', () => {
    beforeEach(() => {
      registerMessageHandlers(mockApp);
    });

    it('should respond to hello message', async () => {
      const helloHandler = mockApp.message.mock.calls.find(call => call[0] === 'hello')[1];

      await helloHandler({ message: mockMessage, say: mockSay });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('Hello <@U123456>! 🐿️🌰'),
        thread_ts: '1234567890.123',
      });
    });

    it('should handle hello message without user property', async () => {
      const helloHandler = mockApp.message.mock.calls.find(call => call[0] === 'hello')[1];
      const messageWithoutUser = { ts: '1234567890.123' };

      await helloHandler({ message: messageWithoutUser, say: mockSay });

      expect(mockSay).not.toHaveBeenCalled();
    });

    it('should handle hello message without ts property', async () => {
      const helloHandler = mockApp.message.mock.calls.find(call => call[0] === 'hello')[1];
      const messageWithoutTs = { user: 'U123456' };

      await helloHandler({ message: messageWithoutTs, say: mockSay });

      expect(mockSay).not.toHaveBeenCalled();
    });

    it('should handle errors in hello handler', async () => {
      const helloHandler = mockApp.message.mock.calls.find(call => call[0] === 'hello')[1];
      mockSay.mockRejectedValueOnce(new Error('API Error'));

      await expect(helloHandler({ message: mockMessage, say: mockSay })).resolves.not.toThrow();
    });
  });

  describe('help message handler', () => {
    beforeEach(() => {
      registerMessageHandlers(mockApp);
    });

    it('should respond to help message', async () => {
      const helpHandler = mockApp.message.mock.calls.find(call => call[0].toString() === '/help/i')[1];

      await helpHandler({ message: mockMessage, say: mockSay });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('Here\'s what this squirrel can do!'),
        thread_ts: '1234567890.123',
      });
    });

    it('should include all help commands in response', async () => {
      const helpHandler = mockApp.message.mock.calls.find(call => call[0].toString() === '/help/i')[1];

      await helpHandler({ message: mockMessage, say: mockSay });

      const helpText = mockSay.mock.calls[0][0].text;
      expect(helpText).toContain('hello');
      expect(helpText).toContain('help');
      expect(helpText).toContain('status');
      expect(helpText).toContain('info');
      expect(helpText).toContain('@acorn');
    });

    it('should handle help message without user property', async () => {
      const helpHandler = mockApp.message.mock.calls.find(call => call[0].toString() === '/help/i')[1];
      const messageWithoutUser = { ts: '1234567890.123' };

      await helpHandler({ message: messageWithoutUser, say: mockSay });

      expect(mockSay).not.toHaveBeenCalled();
    });

    it('should handle errors in help handler', async () => {
      const helpHandler = mockApp.message.mock.calls.find(call => call[0].toString() === '/help/i')[1];
      mockSay.mockRejectedValueOnce(new Error('API Error'));

      await expect(helpHandler({ message: mockMessage, say: mockSay })).resolves.not.toThrow();
    });
  });

  describe('generic message handler', () => {
    beforeEach(() => {
      registerMessageHandlers(mockApp);
    });

    it('should log non-hello/help messages', async () => {
      // The generic handler is the third registered handler (hello, help, then generic)
      const genericHandler = mockApp.message.mock.calls[2][0];
      const messageWithText = { ...mockMessage, text: 'some random message' };

      await genericHandler({ message: messageWithText });

      // Should not throw and should log the message (mocked in setup.ts)
      expect(console.log).toHaveBeenCalled();
    });

    it('should not log hello messages', async () => {
      // The generic handler is the third registered handler (hello, help, then generic)
      const genericHandler = mockApp.message.mock.calls[2][0];
      const messageWithHello = { ...mockMessage, text: 'hello there' };

      await genericHandler({ message: messageWithHello });

      // Should not log messages containing 'hello'
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should not log help messages', async () => {
      // The generic handler is the third registered handler (hello, help, then generic)
      const genericHandler = mockApp.message.mock.calls[2][0];
      const messageWithHelp = { ...mockMessage, text: 'I need help' };

      await genericHandler({ message: messageWithHelp });

      // Should not log messages containing 'help'
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle message without text property', async () => {
      // The generic handler is the third registered handler (hello, help, then generic)
      const genericHandler = mockApp.message.mock.calls[2][0];
      const messageWithoutText = { user: 'U123456' };

      await expect(genericHandler({ message: messageWithoutText })).resolves.not.toThrow();
    });
  });
});