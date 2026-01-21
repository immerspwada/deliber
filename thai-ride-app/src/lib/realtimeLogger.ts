/**
 * Realtime Logger - ระบบติดตาม log แบบ realtime
 * แสดง logs ในรูปแบบที่อ่านง่าย พร้อม filter และ export
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  category: string
  message: string
  data?: any
  stack?: string
  userId?: string
  page?: string
}

class RealtimeLogger {
  private logs: LogEntry[] = []
  private maxLogs = 500 // เก็บ log สูงสุด 500 รายการ
  private listeners: Set<(logs: LogEntry[]) => void> = new Set()
  private enabled = import.meta.env.DEV // เปิดใช้งานใน dev mode เท่านั้น

  constructor() {
    // Override console methods
    if (this.enabled) {
      this.interceptConsole()
    }
  }

  private interceptConsole() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    }

    // Override console.log
    console.log = (...args: any[]) => {
      originalConsole.log(...args)
      this.addLog('info', 'console', this.formatMessage(args), args)
    }

    // Override console.info
    console.info = (...args: any[]) => {
      originalConsole.info(...args)
      this.addLog('info', 'console', this.formatMessage(args), args)
    }

    // Override console.warn
    console.warn = (...args: any[]) => {
      originalConsole.warn(...args)
      this.addLog('warn', 'console', this.formatMessage(args), args)
    }

    // Override console.error
    console.error = (...args: any[]) => {
      originalConsole.error(...args)
      const stack = new Error().stack
      this.addLog('error', 'console', this.formatMessage(args), args, stack)
    }

    // Override console.debug
    console.debug = (...args: any[]) => {
      originalConsole.debug(...args)
      this.addLog('debug', 'console', this.formatMessage(args), args)
    }
  }

  private formatMessage(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')
  }

  private addLog(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    stack?: string
  ) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stack,
      userId: this.getCurrentUserId(),
      page: window.location.pathname,
    }

    this.logs.unshift(entry) // เพิ่มที่ด้านบน (ล่าสุดก่อน)

    // จำกัดจำนวน logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // แจ้ง listeners
    this.notifyListeners()
    
    // Save to database (async, don't wait)
    this.saveToDatabase(entry).catch(err => {
      // Silent fail - don't log to avoid infinite loop
      console.debug('Failed to save log to database:', err)
    })
  }

  private getCurrentUserId(): string | undefined {
    try {
      const authStore = localStorage.getItem('auth-store')
      if (authStore) {
        const parsed = JSON.parse(authStore)
        return parsed?.state?.user?.id
      }
    } catch {
      return undefined
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.logs]))
  }
  
  private async saveToDatabase(entry: LogEntry) {
    // Only save in production or when explicitly enabled
    if (!this.enabled) return
    
    try {
      // Dynamic import to avoid circular dependencies
      const { supabase } = await import('./supabase')
      
      await supabase.rpc('save_log_entry', {
        p_level: entry.level,
        p_category: entry.category,
        p_message: entry.message,
        p_data: entry.data ? JSON.stringify(entry.data) : null,
        p_stack: entry.stack || null,
        p_page: entry.page || null,
        p_session_id: this.getSessionId(),
        p_user_agent: navigator.userAgent,
        p_ip_address: null // Will be set by server
      })
    } catch (err) {
      // Silent fail
    }
  }
  
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('log_session_id')
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('log_session_id', sessionId)
    }
    return sessionId
  }

  // Public API
  public log(category: string, message: string, data?: any) {
    this.addLog('info', category, message, data)
  }

  public success(category: string, message: string, data?: any) {
    this.addLog('success', category, message, data)
  }

  public warn(category: string, message: string, data?: any) {
    this.addLog('warn', category, message, data)
  }

  public error(category: string, message: string, error?: any) {
    const stack = error?.stack || new Error().stack
    this.addLog('error', category, message, error, stack)
  }

  public debug(category: string, message: string, data?: any) {
    this.addLog('debug', category, message, data)
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener)
    listener([...this.logs]) // ส่ง logs ปัจจุบันทันที
    return () => this.listeners.delete(listener)
  }

  public clear() {
    this.logs = []
    this.notifyListeners()
  }

  public getLogs() {
    return [...this.logs]
  }

  public exportLogs() {
    const data = JSON.stringify(this.logs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  public isEnabled() {
    return this.enabled
  }
}

// Singleton instance
export const realtimeLogger = new RealtimeLogger()

// Helper functions
export const logInfo = (category: string, message: string, data?: any) =>
  realtimeLogger.log(category, message, data)

export const logSuccess = (category: string, message: string, data?: any) =>
  realtimeLogger.success(category, message, data)

export const logWarn = (category: string, message: string, data?: any) =>
  realtimeLogger.warn(category, message, data)

export const logError = (category: string, message: string, error?: any) =>
  realtimeLogger.error(category, message, error)

export const logDebug = (category: string, message: string, data?: any) =>
  realtimeLogger.debug(category, message, data)
