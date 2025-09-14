import { registerEventHandlers } from '../../src/handlers/eventHandler';

describe('EventHandler', () => {
  let mockApp: any;
  let mockSay: jest.Mock;
  let mockEvent: any;

  beforeEach(() => {
    mockSay = jest.fn();
    mockEvent = {
      user: 'U123456',
      channel: 'C123456',
    };

    mockApp = {
      event: jest.fn(),
    };
  });

  describe('registerEventHandlers', () => {
    it('should register all event handlers', () => {
      registerEventHandlers(mockApp);

      expect(mockApp.event).toHaveBeenCalledTimes(2);
      expect(mockApp.event).toHaveBeenCalledWith('member_joined_channel', expect.any(Function));
      expect(mockApp.event).toHaveBeenCalledWith('reaction_added', expect.any(Function));
    });
  });

  describe('member_joined_channel handler', () => {
    beforeEach(() => {
      registerEventHandlers(mockApp);
    });

    it('should welcome new member to channel', async () => {
      const memberJoinedHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'member_joined_channel')[1];

      await memberJoinedHandler({ event: mockEvent, say: mockSay });

      expect(mockSay).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to our tree, <@U123456>!')
      );
      expect(mockSay).toHaveBeenCalledWith(
        expect.stringContaining('🐿️🌰')
      );
      expect(mockSay).toHaveBeenCalledWith(
        expect.stringContaining('chittering excitedly')
      );
    });

    it('should include squirrel personality in welcome message', async () => {
      const memberJoinedHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'member_joined_channel')[1];

      await memberJoinedHandler({ event: mockEvent, say: mockSay });

      const welcomeMessage = mockSay.mock.calls[0][0];
      expect(welcomeMessage).toContain('organizing my nut collection');
      expect(welcomeMessage).toContain('Make yourself at home!');
      expect(welcomeMessage).toContain('🎉');
    });

    it('should handle errors in member joined handler', async () => {
      const memberJoinedHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'member_joined_channel')[1];

      mockSay.mockRejectedValueOnce(new Error('API Error'));

      await expect(
        memberJoinedHandler({ event: mockEvent, say: mockSay })
      ).resolves.not.toThrow();
    });

    it('should work with different user IDs', async () => {
      const memberJoinedHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'member_joined_channel')[1];

      const differentEvent = { ...mockEvent, user: 'U789012' };

      await memberJoinedHandler({ event: differentEvent, say: mockSay });

      expect(mockSay).toHaveBeenCalledWith(
        expect.stringContaining('<@U789012>')
      );
    });
  });

  describe('reaction_added handler', () => {
    beforeEach(() => {
      registerEventHandlers(mockApp);
    });

    it('should log reaction added events', async () => {
      const reactionHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'reaction_added')[1];

      const reactionEvent = {
        ...mockEvent,
        reaction: 'thumbsup',
      };

      await reactionHandler({ event: reactionEvent });

      // Should not throw and should log the reaction (mocked in setup.ts)
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle different reaction types', async () => {
      const reactionHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'reaction_added')[1];

      const reactions = ['heart', 'fire', 'laughing', 'confused'];

      for (const reaction of reactions) {
        const reactionEvent = {
          ...mockEvent,
          reaction,
        };

        await expect(
          reactionHandler({ event: reactionEvent })
        ).resolves.not.toThrow();
      }
    });

    it('should handle missing reaction property', async () => {
      const reactionHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'reaction_added')[1];

      const eventWithoutReaction = { ...mockEvent };
      delete eventWithoutReaction.reaction;

      await expect(
        reactionHandler({ event: eventWithoutReaction })
      ).resolves.not.toThrow();
    });

    it('should handle errors in reaction handler', async () => {
      const reactionHandler = mockApp.event.mock.calls
        .find(call => call[0] === 'reaction_added')[1];

      // Force an error by making console.log throw (simulating logging error)
      const originalConsoleLog = console.log;
      console.log = jest.fn().mockImplementationOnce(() => {
        throw new Error('Logging error');
      });

      const reactionEvent = {
        ...mockEvent,
        reaction: 'thumbsup',
      };

      await expect(
        reactionHandler({ event: reactionEvent })
      ).resolves.not.toThrow();

      console.log = originalConsoleLog;
    });
  });
});