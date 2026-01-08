/**
 * Production-Safe Logger
 * 
 * Only logs in development mode (import.meta.env.DEV)
 * In production, logs are silently ignored (except errors)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? import.meta.env.DEV;
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().slice(11, 23);
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp} ${prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    console.debug(this.formatMessage('debug', message), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    console.info(this.formatMessage('info', message), ...args);
  }

  log(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    console.log(this.formatMessage('info', message), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.enabled) return;
    console.warn(this.formatMessage('warn', message), ...args);
  }

  error(message: string, ...args: unknown[]): void {
    // Errors are always logged (for monitoring)
    console.error(this.formatMessage('error', message), ...args);
  }
}

// Factory function to create named loggers
export const createLogger = (prefix: string): Logger => {
  return new Logger({ prefix });
};

// Default logger instance (for backward compatibility)
export const logger = new Logger();

// Pre-configured loggers for specific modules
export const providerLogger = createLogger('Provider');
export const realtimeLogger = createLogger('Realtime');
export const authLogger = createLogger('Auth');
export const walletLogger = createLogger('Wallet');
export const adminLogger = createLogger('Admin');
export const customerLogger = createLogger('Customer');

// Default export
export default Logger;
