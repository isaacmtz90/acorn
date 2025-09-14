interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
}

export const logger: Logger = {
  info: (message: string, ...args: unknown[]): void => {
    console.log(`[${new Date().toISOString()}] INFO:`, message, ...args);
  },

  error: (message: string, ...args: unknown[]): void => {
    console.error(`[${new Date().toISOString()}] ERROR:`, message, ...args);
  },

  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[${new Date().toISOString()}] WARN:`, message, ...args);
  }
};