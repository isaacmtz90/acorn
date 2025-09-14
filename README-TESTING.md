# Jest Unit Testing Setup

## Overview

This project now includes comprehensive Jest unit testing for all handler modules with clean and concise test coverage.

## Setup

- **Jest Configuration**: `jest.config.js` with TypeScript support
- **Test Setup**: `tests/setup.ts` with mocks and environment variables
- **Coverage**: Configured to track test coverage across all handlers

## Test Structure

### 📁 Test Organization
```
tests/
├── setup.ts                           # Global test setup and mocks
├── simple.test.ts                     # Basic infrastructure smoke tests
└── handlers/
    ├── messageHandler.test.ts          # Message pattern handlers
    ├── eventHandler.test.ts           # Slack event handlers
    ├── mentionHandler.test.ts         # Bot mention handlers
    └── slackEventsHandler.test.ts     # Lambda event processing
```

## Test Coverage

### ✅ messageHandler.test.ts
- **Handler Registration**: Verifies all message handlers are registered
- **Hello Handler**: Tests greeting responses and error handling
- **Help Handler**: Tests help command responses and content
- **Generic Handler**: Tests message logging and filtering
- **Error Scenarios**: Tests graceful error handling

### ✅ eventHandler.test.ts
- **Handler Registration**: Verifies event handler setup
- **Member Joined**: Tests welcome message formatting and personality
- **Reaction Added**: Tests reaction logging and error handling
- **Error Scenarios**: Tests resilient error handling

### ✅ mentionHandler.test.ts
- **Complex Handler**: Tests the most sophisticated bot interactions
- **Pattern Matching**: Tests all mention patterns (greetings, help, thanks, status, info)
- **AI Streaming**: Tests AI query processing and streaming responses
- **Text Cleaning**: Tests mention stripping and text processing
- **Error Handling**: Comprehensive error scenario testing
- **Mocked Dependencies**: AI service and streaming helper properly mocked

### ✅ slackEventsHandler.test.ts
- **Lambda Integration**: Tests AWS Lambda event processing
- **Event Routing**: Tests routing to appropriate handlers
- **API Integration**: Tests direct Slack API calls with fetch
- **Error Handling**: Tests various error scenarios
- **Security**: Tests signature validation and CORS handling

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test messageHandler

# Run simple smoke tests
npm run test:simple

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Key Features

### 🔧 Comprehensive Mocking
- **Environment Variables**: Proper test environment setup
- **External Dependencies**: AI service, streaming helper, and Slack API mocked
- **Console Output**: Controlled logging during tests
- **Fetch API**: Global fetch mocking for HTTP requests

### 🎯 Test Quality
- **Unit Focus**: Each test focuses on specific functionality
- **Clean Structure**: Well-organized describe/it blocks
- **Error Coverage**: Thorough error scenario testing
- **Edge Cases**: Tests handle missing properties and malformed data

### 📊 Coverage Goals
- **Handler Functions**: 100% coverage of all registered handlers
- **Error Paths**: All error handling paths tested
- **Edge Cases**: Boundary conditions and missing data scenarios
- **Integration**: Handler registration and event routing

## Test Examples

### Basic Handler Test
```typescript
it('should respond to hello message', async () => {
  const helloHandler = mockApp.message.mock.calls.find(call => call[0] === 'hello')[1];

  await helloHandler({ message: mockMessage, say: mockSay });

  expect(mockSay).toHaveBeenCalledWith({
    text: expect.stringContaining('Hello <@U123456>! 🐿️🌰'),
    thread_ts: '1234567890.123',
  });
});
```

### Error Handling Test
```typescript
it('should handle errors gracefully', async () => {
  mockSay.mockRejectedValueOnce(new Error('API Error'));

  await expect(handler({ event: mockEvent, say: mockSay })).resolves.not.toThrow();
});
```

## Current Status

- ✅ **Testing Infrastructure**: Complete Jest setup with TypeScript
- ✅ **Handler Tests**: All 4 handler modules have comprehensive tests
- ✅ **Mocking Strategy**: Proper isolation of external dependencies
- ✅ **Error Coverage**: Extensive error scenario testing
- ⚠️ **Minor Issues**: Some TypeScript strict mode warnings (non-breaking)
- 🎯 **Ready for Development**: Tests provide safety net for refactoring

The testing suite provides a solid foundation for maintaining code quality and catching regressions during development.