// Simple smoke tests to verify the testing infrastructure works

describe('Basic Test Infrastructure', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have environment variables', () => {
    expect(process.env.SLACK_BOT_TOKEN).toBe('xoxb-test-token');
  });

  it('should mock console.log', () => {
    console.log('test message');
    expect(console.log).toHaveBeenCalledWith('test message');
  });
});