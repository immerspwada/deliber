/**
 * Production Logger
 * Centralized logging with levels and remote reporting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: Date
  context?: string
}

interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  batchSize: number
  flushInterval: number
}

const defaultConfig: LoggerConfig = {
  minLevel: import.meta.env.PROD ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: import.meta.env.PROD,
  batchSize: 10,
  flushInterval: 30000 // 30 seconds
}

class Logger {
  private config: LoggerConfig
  private buffer: LogEntry[] = []
  private flushTimer: number | null = null
  private context: string = ''

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    
    if (this.config.enableRemote) {
      this.startFlushTimer()
    }
  }

  /**
   * Set context for subsequent logs
   */
  setContext(context: string): Logger {
    const childLogger = new Logger(this.config)
    childLogger.context = context
    return childLogger
  }

  /**
   * Debug level log
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  /**
   * Info level log
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data)
  }

  /**
   * Warning level log
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data)
  }

  /**
   * Error level log
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data)
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.config.minLevel) return

    const entry: LogEntry = {
      level,
      message: this.context ? `[${this.context}] ${message}` : message,
      data,
      timestamp: new Date(),
      context: this.context
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // Buffer for remote
    if (this.config.enableRemote) {
      this.buffer.push(entry)
      
      if (this.buffer.length >= this.config.batchSize) {
        this.flush()
      }
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}]`
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '')
        break
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '')
        break
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '')
        break
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '')
        break
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval) as unknown as number
  }

  /**
   * Flush buffer to remote
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    if (!this.config.remoteEndpoint) return

    const entries = [...this.buffer]
    this.buffer = []

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: entries.map(e => ({
            level: LogLevel[e.level],
            message: e.message,
            data: e.data,
            timestamp: e.timestamp.toISOString(),
            context: e.context
          }))
        })
      })
    } catch (err) {
      // Re-add to buffer on failure
      this.buffer = [...entries, ...this.buffer]
      console.error('Failed to flush logs:', err)
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush()
  }
}

// Export singleton instance
export const logger = new Logger()

// Export for creating child loggers
export const createLogger = (context: string) => logger.setContext(context)
